"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch, getAuthUser, logoutUser } from "../auth";

type Job = {
  id: number; title: string; company: string; description: string;
  location: string; job_type: string; required_skills: string[] | string;
};

type Application = {
  id: number; student_name: string; job_title: string;
  company: string; status: string;
};

type Candidate = {
  student_id: number; name: string | null; college: string | null;
  degree: string | null; cgpa: number | null; skills: string[];
  matched_skills: string[]; missing_skills: string[]; match_percentage: number;
};

export default function RecruiterPage() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [form, setForm] = useState({
    title: "", company: "", description: "", location: "",
    job_type: "Internship", required_skills: "",
  });

  const load = async () => {
    const [jobsRes, appsRes] = await Promise.all([
      authenticatedFetch("https://placement-ai-api-2f64.onrender.com/recruiter/jobs"),
      authenticatedFetch("https://placement-ai-api-2f64.onrender.com/recruiter/applications"),
    ]);
    if (jobsRes.ok) setJobs((await jobsRes.json()).jobs);
    if (appsRes.ok) setApplications((await appsRes.json()).applications);
  };

  useEffect(() => {
    const current = getAuthUser();
    setUser(current);
    if (current?.role === "recruiter") load();
  }, []);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await authenticatedFetch("https://placement-ai-api-2f64.onrender.com/recruiter/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        required_skills: form.required_skills.split(",").map(s => s.trim()).filter(Boolean),
      }),
    });

    if (res.ok) {
      setMessage("Job created successfully.");
      setForm({ title: "", company: "", description: "", location: "", job_type: "Internship", required_skills: "" });
      load();
    }
  };

  const loadCandidates = async (jobId: number) => {
    setSelectedJob(jobId);
    setLoadingCandidates(true);
    const res = await authenticatedFetch(`https://placement-ai-api-2f64.onrender.com/recruiter/jobs/${jobId}/candidates`);
    if (res.ok) setCandidates((await res.json()).candidates);
    setLoadingCandidates(false);
  };

  const updateStatus = async (id: number, status: string) => {
    await authenticatedFetch(`https://placement-ai-api-2f64.onrender.com/recruiter/applications/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  if (!user || user.role !== "recruiter") {
    return <main className="min-h-screen p-8">
      <button
        onClick={() => {
          logoutUser();
          window.location.href = "/";
        }}
        className="fixed right-6 top-6 z-50 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow hover:opacity-80"
      >
        Logout
      </button>
<h1 className="text-2xl font-bold">Recruiter access required</h1></main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
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
        <h1 className="text-3xl font-bold">Recruiter Portal</h1>
        <p className="mt-1 text-gray-600">Manage jobs, candidates and your hiring pipeline.</p>

        {message && <div className="mt-4 rounded-lg bg-green-50 p-3 text-green-700">{message}</div>}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow"><p className="text-gray-500">Jobs</p><p className="text-3xl font-bold">{jobs.length}</p></div>
          <div className="rounded-xl bg-white p-5 shadow"><p className="text-gray-500">Applicants</p><p className="text-3xl font-bold">{applications.length}</p></div>
          <div className="rounded-xl bg-white p-5 shadow"><p className="text-gray-500">Shortlisted</p><p className="text-3xl font-bold">{applications.filter(a => a.status === "shortlisted").length}</p></div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Create Job</h2>
          <form onSubmit={createJob} className="mt-4 grid gap-3 md:grid-cols-2">
            <input required placeholder="Job title" value={form.title} onChange={e => setForm({...form,title:e.target.value})} className="rounded border p-2" />
            <input required placeholder="Company" value={form.company} onChange={e => setForm({...form,company:e.target.value})} className="rounded border p-2" />
            <input required placeholder="Location" value={form.location} onChange={e => setForm({...form,location:e.target.value})} className="rounded border p-2" />
            <select value={form.job_type} onChange={e => setForm({...form,job_type:e.target.value})} className="rounded border p-2">
              <option>Internship</option><option>Full-time</option><option>Part-time</option>
            </select>
            <input placeholder="Skills: Python, SQL, React" value={form.required_skills} onChange={e => setForm({...form,required_skills:e.target.value})} className="rounded border p-2 md:col-span-2" />
            <textarea required placeholder="Job description" value={form.description} onChange={e => setForm({...form,description:e.target.value})} className="rounded border p-2 md:col-span-2" rows={4} />
            <button className="rounded bg-black px-4 py-2 font-medium text-white md:col-span-2">Publish Job</button>
          </form>
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">My Jobs</h2>
          <div className="mt-4 space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-gray-600">{job.company} · {job.location}</p>
                    <p className="mt-2 text-sm">{job.description}</p>
                    <p className="mt-2 text-sm font-medium">
                      Skills: {Array.isArray(job.required_skills) ? job.required_skills.join(", ") : String(job.required_skills ?? "")}
                    </p>
                  </div>
                  <button onClick={() => loadCandidates(job.id)} className="rounded bg-black px-4 py-2 text-sm font-medium text-white">
                    Find Candidates
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedJob !== null && (
          <section className="mt-6 rounded-xl bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">AI Candidate Matching</h2>
              <button onClick={() => setSelectedJob(null)} className="text-sm text-gray-500">Close</button>
            </div>

            {loadingCandidates ? (
              <p className="mt-4 text-gray-500">Finding matching candidates...</p>
            ) : candidates.length === 0 ? (
              <p className="mt-4 text-gray-500">No student profiles available yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {candidates.map(candidate => (
                  <div key={candidate.student_id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{candidate.name || "Student"}</h3>
                        <p className="text-sm text-gray-600">
                          {candidate.college || "College not provided"} · {candidate.degree || "Degree not provided"}
                        </p>
                        {candidate.cgpa !== null && <p className="text-sm text-gray-600">CGPA: {candidate.cgpa}</p>}
                      </div>
                      <div className="rounded-lg bg-gray-100 px-4 py-2 text-center">
                        <p className="text-2xl font-bold">{candidate.match_percentage}%</p>
                        <p className="text-xs text-gray-500">Skill Match</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-medium">Matched Skills</p>
                      <p className="mt-1 text-sm text-gray-600">{candidate.matched_skills.length ? candidate.matched_skills.join(", ") : "None"}</p>
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-medium">Skill Gaps</p>
                      <p className="mt-1 text-sm text-gray-600">{candidate.missing_skills.length ? candidate.missing_skills.join(", ") : "No skill gaps"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Candidate Pipeline</h2>
          <div className="mt-4 space-y-3">
            {applications.map(app => (
              <div key={app.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">{app.student_name}</h3>
                  <p className="text-gray-600">{app.job_title} · {app.company}</p>
                </div>
                <select value={app.status} onChange={e => updateStatus(app.id,e.target.value)} className="rounded border px-3 py-2">
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

