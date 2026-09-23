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

export default function Home() {
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/students/").then((res) => res.json()),
      fetch("http://127.0.0.1:8000/students/1/skills").then((res) => res.json()),
      fetch("http://127.0.0.1:8000/applications/student/1").then((res) =>
        res.json()
      ),
    ]).then(([studentData, skillData, applicationData]) => {
      setStudent(studentData.students[0] ?? null);
      setSkills(skillData.skills);
      setApplications(applicationData.applications);
    });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
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