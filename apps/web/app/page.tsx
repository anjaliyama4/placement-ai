"use client";

import { useEffect, useState } from "react";

type Student = {
  id: number;
  full_name: string;
  college: string | null;
  degree: string | null;
  graduation_year: number | null;
  cgpa: number | null;
};

type Skill = {
  id: number;
  name: string;
  proficiency: string | null;
};

type Application = {
  id: number;
  job_id: number;
  job_title: string;
  company: string;
  status: string;
};

type Job = {
  id: number;
  title: string;
  company: string;
  description: string | null;
  location: string | null;
  job_type: string | null;
  required_skills: string | null;
};

type Match = {
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
};

export default function Home() {
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<Record<number, Match>>({});

  useEffect(() => {
    async function loadDashboard() {
      const [studentData, skillData, applicationData, jobData] =
        await Promise.all([
          fetch("http://127.0.0.1:8000/students/").then((res) => res.json()),
          fetch("http://127.0.0.1:8000/students/1/skills").then((res) =>
            res.json()
          ),
          fetch("http://127.0.0.1:8000/applications/student/1").then((res) =>
            res.json()
          ),
          fetch("http://127.0.0.1:8000/jobs/").then((res) => res.json()),
        ]);

      setStudent(studentData.students[0] ?? null);
      setSkills(skillData.skills);
      setApplications(applicationData.applications);
      setJobs(jobData.jobs);

      const matchResults = await Promise.all(
        jobData.jobs.map(async (job: Job) => {
          const response = await fetch(
            `http://127.0.0.1:8000/matching/student/1/job/${job.id}`
          );
          return [job.id, await response.json()] as const;
        })
      );

      setMatches(Object.fromEntries(matchResults));
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Placement AI Dashboard</h1>

        {student && (
          <section className="mt-6 rounded-xl bg-white p-6 shadow">
            <h2 className="text-2xl font-semibold">{student.full_name}</h2>

            <p className="mt-2 text-gray-600">
              {student.college} · {student.degree}
            </p>

            <p className="mt-1 text-gray-600">
              Graduation: {student.graduation_year} · CGPA: {student.cgpa}
            </p>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-xl font-semibold">Skills</h2>

          <div className="mt-3 flex flex-wrap gap-3">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-lg bg-white px-4 py-3 shadow"
              >
                <strong>{skill.name}</strong>

                {skill.proficiency && (
                  <span className="ml-2 text-gray-500">
                    {skill.proficiency}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Available Jobs</h2>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {jobs.map((job) => {
              const match = matches[job.id];

              return (
                <div
                  key={job.id}
                  className="rounded-xl bg-white p-6 shadow"
                >
                  <h3 className="text-xl font-semibold">{job.title}</h3>

                  <p className="mt-1 text-gray-600">{job.company}</p>

                  <p className="mt-3 text-sm text-gray-500">
                    {job.location} · {job.job_type}
                  </p>

                  {job.description && (
                    <p className="mt-3 text-gray-700">
                      {job.description}
                    </p>
                  )}

                  {match && (
                    <div className="mt-5 border-t pt-5">
                      <p className="text-2xl font-bold">
                        {match.match_percentage}% Match
                      </p>

                      <div className="mt-4">
                        <h4 className="font-semibold">Matched Skills</h4>

                        <p className="mt-1 text-gray-700">
                          {match.matched_skills.length > 0
                            ? match.matched_skills.join(", ")
                            : "None"}
                        </p>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-semibold">Missing Skills</h4>

                        <p className="mt-1 text-gray-700">
                          {match.missing_skills.length > 0
                            ? match.missing_skills.join(", ")
                            : "None"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Applications</h2>

          <div className="mt-3 space-y-3">
            {applications.map((application) => (
              <div
                key={application.id}
                className="rounded-lg bg-white p-4 shadow"
              >
                <h3 className="font-semibold">{application.job_title}</h3>

                <p className="text-gray-600">{application.company}</p>

                <p className="mt-1 text-sm">
                  Status: {application.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}