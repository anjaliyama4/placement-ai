"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "./auth";

type StudentProfile = {
  id: number;
  full_name: string;
  phone: string | null;
  college: string | null;
  degree: string | null;
  graduation_year: number | null;
  cgpa: number | null;
};

export default function ProfileEditor({
  studentId,
  onUpdated,
}: {
  studentId: number;
  onUpdated?: () => void;
}) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const response = await authenticatedFetch(
        `http://127.0.0.1:8001/students/${studentId}`
      );

      if (response.ok) {
        setProfile(await response.json());
      }
    }

    loadProfile();
  }, [studentId]);

  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await authenticatedFetch(
        `http://127.0.0.1:8001/students/${studentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: profile.full_name,
            phone: profile.phone || null,
            college: profile.college || null,
            degree: profile.degree || null,
            graduation_year: profile.graduation_year
              ? Number(profile.graduation_year)
              : null,
            cgpa: profile.cgpa ? Number(profile.cgpa) : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Profile update failed.");
        return;
      }

      setProfile(data.student);
      setMessage("Profile updated successfully.");
      onUpdated?.();
    } catch {
      setMessage("Profile update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <section className="mt-6 rounded-xl bg-white p-6 shadow">
        <p className="text-gray-500">Loading profile...</p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl bg-white p-6 shadow">
      <h2 className="text-xl font-semibold">Student Profile</h2>

      <p className="mt-1 text-sm text-gray-500">
        Keep your placement profile up to date.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input
          value={profile.full_name}
          onChange={(e) =>
            setProfile({ ...profile, full_name: e.target.value })
          }
          placeholder="Full name"
          className="rounded-lg border px-4 py-3"
        />

        <input
          value={profile.phone ?? ""}
          onChange={(e) =>
            setProfile({ ...profile, phone: e.target.value })
          }
          placeholder="Phone"
          className="rounded-lg border px-4 py-3"
        />

        <input
          value={profile.college ?? ""}
          onChange={(e) =>
            setProfile({ ...profile, college: e.target.value })
          }
          placeholder="College"
          className="rounded-lg border px-4 py-3"
        />

        <input
          value={profile.degree ?? ""}
          onChange={(e) =>
            setProfile({ ...profile, degree: e.target.value })
          }
          placeholder="Degree"
          className="rounded-lg border px-4 py-3"
        />

        <input
          type="number"
          value={profile.graduation_year ?? ""}
          onChange={(e) =>
            setProfile({
              ...profile,
              graduation_year: e.target.value
                ? Number(e.target.value)
                : null,
            })
          }
          placeholder="Graduation year"
          className="rounded-lg border px-4 py-3"
        />

        <input
          type="number"
          step="0.01"
          min="0"
          max="10"
          value={profile.cgpa ?? ""}
          onChange={(e) =>
            setProfile({
              ...profile,
              cgpa: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder="CGPA"
          className="rounded-lg border px-4 py-3"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={saveProfile}
          disabled={saving || !profile.full_name.trim()}
          className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {message && (
          <p className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
