"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch, getAuthUser, logoutUser } from "../auth";

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  job_type: string;
};

type Application = {
  id: number;
  student_name: string;
  job_title: string;
  company: string;
  status: string;
};

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("Internship");
  const [requiredSkills, setRequiredSkills] = useState("");

  async function loadAdminData() {
    const user = getAuthUser();
    if (!user || user.role !== "admin") {
      setMessage("Admin access required.");
      return;
    }

    const [jobsResponse, applicationsResponse] = await Promise.all([
      authenticatedFetch("http://127.0.0.1:8001/admin/jobs"),
      authenticatedFetch("http://127.0.0.1:8001/admin/applications"),
    ]);

    if (!jobsResponse.ok || !applicationsResponse.ok) {
      setMessage("Unable to load admin data.");
      return;
    }

    const jobsData = await jobsResponse.json();
    const applicationsData = await applicationsResponse.json();

    setJobs(jobsData.jobs ?? []);
    setApplications(applicationsData.applications ?? []);
  }

  useEffect(() => {
    const user = getAuthUser();
    if (!user || user.role !== "admin") {
      window.location.href = "/";
      return;
    }
    loadAdminData();
  }, []);

  async function createJob() {
    const response = await authenticatedFetch(
      "http://127.0.0.1:8001/admin/jobs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          description,
          location,
          job_type: jobType,
          required_skills: requiredSkills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Job creation failed.");
      return;
    }

    setMessage("Job created successfully.");
    setTitle("");
    setCompany("");
    setDescription("");
    setLocation("");
    setRequiredSkills("");
    await loadAdminData();
  }

  async function updateStatus(applicationId: number, status: string) {
    const response = await authenticatedFetch(
      `http://127.0.0.1:8001/admin/applications/${applicationId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );

    if (response.ok) {
      setMessage("Application status updated.");
      await loadAdminData();
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <button
        onClick={() => {
          logoutUser();
          window.location.href = "/";
        }}
        className="fixed right-6 top-6 z-50 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow hover:opacity-80"
      >
        Logout
      </button>

      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Placement AI Admin</h1>

        {message && (
          <p className="mt-4 rounded-lg bg-white p-4 shadow">{message}</p>
        )}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Create Job</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded border p-3" placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="rounded border p-3" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="rounded border p-3" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <select className="rounded border p-3" value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option>Internship</option>
              <option>Full-time</option>
              <option>Part-time</option>
            </select>
          </div>

          <textarea
            className="mt-3 w-full rounded border p-3"
            placeholder="Job description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            className="mt-3 w-full rounded border p-3"
            placeholder="Required skills, comma separated"
            value={requiredSkills}
            onChange={(e) => setRequiredSkills(e.target.value)}
          />

          <button
            onClick={createJob}
            className="mt-4 rounded-lg bg-black px-5 py-3 text-white"
          >
            Create Job
          </button>
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Jobs</h2>
          <div className="mt-4 space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-lg border p-4">
                <strong>{job.title}</strong> — {job.company}
                <p className="text-sm text-gray-600">
                  {job.location} · {job.job_type}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Applications</h2>
          <div className="mt-4 space-y-3">
            {applications.map((application) => (
              <div key={application.id} className="rounded-lg border p-4">
                <strong>{application.student_name}</strong>
                <p>{application.job_title} — {application.company}</p>

                <select
                  className="mt-2 rounded border px-3 py-2"
                  value={application.status}
                  onChange={(e) =>
                    updateStatus(application.id, e.target.value)
                  }
                >
                  <option value="applied">Applied</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}



