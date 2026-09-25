"use client";

import { useState } from "react";
import { loginUser, registerUser, saveAuth } from "./auth";

export default function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (user: any) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");

    try {
      const response =
        mode === "login"
          ? await loginUser(email, password)
          : await registerUser({
              email,
              password,
              full_name: fullName,
              college: college || undefined,
              degree: degree || undefined,
              graduation_year: graduationYear
                ? Number(graduationYear)
                : undefined,
              cgpa: cgpa ? Number(cgpa) : undefined,
            });

      saveAuth(response);
      if (response.user.role === "admin") {
        window.location.href = "/admin";
        return;
      }
      if (response.user.role === "recruiter") {
        window.location.href = "/recruiter";
        return;
      }
      onAuthenticated(response.user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">Placement AI</h1>

          <p className="mt-2 text-gray-600">
            {mode === "login"
              ? "Sign in to your career dashboard."
              : "Create your student placement profile."}
          </p>

          <div className="mt-6 flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`flex-1 rounded-md px-4 py-2 ${
                mode === "login" ? "bg-white shadow" : "text-gray-500"
              }`}
            >
              Login
            </button>

            <button
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              className={`flex-1 rounded-md px-4 py-2 ${
                mode === "register" ? "bg-white shadow" : "text-gray-500"
              }`}
            >
              Register
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border px-4 py-3"
                />

                <input
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="College"
                  className="w-full rounded-lg border px-4 py-3"
                />

                <input
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="Degree"
                  className="w-full rounded-lg border px-4 py-3"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    placeholder="Graduation year"
                    className="w-full rounded-lg border px-4 py-3"
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    placeholder="CGPA"
                    className="w-full rounded-lg border px-4 py-3"
                  />
                </div>
              </>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border px-4 py-3"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border px-4 py-3"
            />

            <button
              onClick={submit}
              disabled={
                loading ||
                !email.trim() ||
                !password.trim() ||
                (mode === "register" && !fullName.trim())
              }
              className="w-full rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login"
                  : "Create Account"}
            </button>

            {message && (
              <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                {message}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}





