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
};

type Match = {
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
};

type CareerIntelligence = {
  student: {
    name: string;
    degree: string;
    graduation_year: number;
    cgpa: number;
  };
  current_skills: string[];
  career_paths: string[];
  recommendations: string[];
};

export default function Home() {
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<Record<number, Match>>({});
  const [career, setCareer] =
    useState<CareerIntelligence | null>(null);

  const [selectedSkill, setSelectedSkill] = useState("");
  const [proficiency, setProficiency] = useState("Beginner");
  const [addingSkill, setAddingSkill] = useState(false);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");

  const [applyingJob, setApplyingJob] = useState<number | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");

  async function loadDashboard() {
    try {
      const [
        studentData,
        skillData,
        allSkillData,
        applicationData,
        jobData,
      ] = await Promise.all([
        fetch("http://127.0.0.1:8000/students/").then((res) =>
          res.json()
        ),
        fetch("http://127.0.0.1:8000/skills/student/1").then((res) =>
          res.json()
        ),
        fetch("http://127.0.0.1:8000/skills/").then((res) =>
          res.json()
        ),
        fetch("http://127.0.0.1:8000/applications/student/1").then(
          (res) => res.json()
        ),
        fetch("http://127.0.0.1:8000/jobs/").then((res) =>
          res.json()
        ),
      ]);

      setStudent(studentData.students[0] ?? null);
      setSkills(skillData.skills);
      setAllSkills(allSkillData.skills);
      setApplications(applicationData.applications);
      setJobs(jobData.jobs);

      const careerResponse = await fetch(
        "http://127.0.0.1:8000/career/student/1"
      );

      if (careerResponse.ok) {
        const careerData = await careerResponse.json();
        setCareer(careerData);
      }

      const matchResults = await Promise.all(
        jobData.jobs.map(async (job: Job) => {
          const response = await fetch(
            `http://127.0.0.1:8000/matching/student/1/job/${job.id}`
          );

          return [job.id, await response.json()] as const;
        })
      );

      setMatches(Object.fromEntries(matchResults));
    } catch (error) {
      console.error("Dashboard loading failed:", error);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function addSkill() {
    if (!selectedSkill) return;

    setAddingSkill(true);

    try {
      await fetch("http://127.0.0.1:8000/skills/student/1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill_id: Number(selectedSkill),
          proficiency,
        }),
      });

      setSelectedSkill("");
      setProficiency("Beginner");

      await loadDashboard();
    } finally {
      setAddingSkill(false);
    }
  }

  async function uploadResume() {
    if (!resumeFile) return;

    setUploadingResume(true);
    setResumeMessage("");

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);

      const response = await fetch(
        "http://127.0.0.1:8000/resumes/student/1",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        const added = data.added_skills ?? [];

        setResumeMessage(
          added.length > 0
            ? `Resume analyzed. Added skills: ${added.join(", ")}`
            : "Resume analyzed. No new skills were added."
        );

        setResumeFile(null);
        await loadDashboard();
      } else {
        setResumeMessage(data.detail || "Resume upload failed.");
      }
    } catch (error) {
      console.error("Resume upload failed:", error);
      setResumeMessage("Resume upload failed.");
    } finally {
      setUploadingResume(false);
    }
  }

  async function applyToJob(jobId: number) {
    setApplyingJob(jobId);
    setApplicationMessage("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/applications/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: 1,
            job_id: jobId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setApplicationMessage(data.message);
        await loadDashboard();
      } else {
        setApplicationMessage("Application failed.");
      }
    } catch (error) {
      console.error("Application failed:", error);
      setApplicationMessage("Application failed.");
    } finally {
      setApplyingJob(null);
    }
  }

  const availableSkills = allSkills.filter(
    (skill) =>
      !skills.some(
        (studentSkill) => studentSkill.id === skill.id
      )
  );

  const recommendedJobs = [...jobs].sort(
    (a, b) =>
      (matches[b.id]?.match_percentage ?? 0) -
      (matches[a.id]?.match_percentage ?? 0)
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">
          Placement AI Dashboard
        </h1>

        {student && (
          <section className="mt-6 rounded-xl bg-white p-6 shadow">
            <h2 className="text-2xl font-semibold">
              {student.full_name}
            </h2>

            <p className="mt-2 text-gray-600">
              {student.college} · {student.degree}
            </p>

            <p className="mt-1 text-gray-600">
              Graduation: {student.graduation_year} · CGPA:{" "}
              {student.cgpa}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Resume Intelligence
          </h2>

          <p className="mt-2 text-gray-600">
            Upload your resume to automatically detect and add
            technical skills to your profile.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) =>
                setResumeFile(e.target.files?.[0] ?? null)
              }
              className="rounded-lg border bg-white px-3 py-2"
            />

            <button
              onClick={uploadResume}
              disabled={!resumeFile || uploadingResume}
              className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
            >
              {uploadingResume
                ? "Analyzing..."
                : "Upload Resume"}
            </button>
          </div>

          {resumeMessage && (
            <p className="mt-4 rounded-lg bg-gray-100 p-3 text-gray-700">
              {resumeMessage}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Skills
          </h2>

          <div className="mt-3 flex flex-wrap gap-3">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-lg bg-gray-100 px-4 py-3"
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

          <div className="mt-6 flex flex-wrap gap-3">
            <select
              value={selectedSkill}
              onChange={(e) =>
                setSelectedSkill(e.target.value)
              }
              className="rounded-lg border px-4 py-2"
            >
              <option value="">Select skill</option>

              {availableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>

            <select
              value={proficiency}
              onChange={(e) =>
                setProficiency(e.target.value)
              }
              className="rounded-lg border px-4 py-2"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>

            <button
              onClick={addSkill}
              disabled={!selectedSkill || addingSkill}
              className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
            >
              {addingSkill ? "Adding..." : "Add Skill"}
            </button>
          </div>
        </section>

        {career && (
          <section className="mt-8 rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">
              AI Career Intelligence
            </h2>

            <p className="mt-2 text-gray-600">
              Personalized career guidance based on your
              current profile and skills.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold">
                  Suggested Career Paths
                </h3>

                <ul className="mt-3 list-disc pl-5">
                  {career.career_paths.map((path) => (
                    <li key={path}>{path}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold">
                  Recommended Next Steps
                </h3>

                <ul className="mt-3 list-disc pl-5">
                  {career.recommendations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Recommended Jobs
          </h2>

          <p className="mt-2 text-gray-600">
            Jobs are ordered by your current skill alignment.
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {recommendedJobs.map((job) => {
              const match = matches[job.id];

              if (!match) {
                return null;
              }

              const alreadyApplied = applications.some(
                (application) => application.job_id === job.id
              );

              return (
                <div
                  key={job.id}
                  className="rounded-xl bg-white p-6 shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {job.title}
                      </h3>

                      <p className="mt-1 text-gray-600">
                        {job.company}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-100 px-3 py-2 text-center">
                      <p className="text-xl font-bold">
                        {match.match_percentage}%
                      </p>

                      <p className="text-xs text-gray-500">
                        Match
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-500">
                    {job.location} · {job.job_type}
                  </p>

                  {job.description && (
                    <p className="mt-3 text-gray-700">
                      {job.description}
                    </p>
                  )}

                  <div className="mt-5 border-t pt-5">
                    <h4 className="font-semibold">
                      Your Skill Alignment
                    </h4>

                    <p className="mt-2 text-sm text-gray-700">
                      <strong>Matched:</strong>{" "}
                      {match.matched_skills.length > 0
                        ? match.matched_skills.join(", ")
                        : "None"}
                    </p>

                    <p className="mt-2 text-sm text-gray-700">
                      <strong>Missing:</strong>{" "}
                      {match.missing_skills.length > 0
                        ? match.missing_skills.join(", ")
                        : "None"}
                    </p>
                  </div>

                  {match.missing_skills.length > 0 ? (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      <h4 className="font-semibold">
                        Skill Gap Analysis
                      </h4>

                      <p className="mt-1 text-sm text-gray-600">
                        Developing these skills could improve
                        your alignment with this role.
                      </p>

                      <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
                        {match.missing_skills.map((skill) => (
                          <li key={skill}>
                            Learn <strong>{skill}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      <p className="font-semibold">
                        No current skill gaps detected.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => applyToJob(job.id)}
                    disabled={
                      applyingJob === job.id || alreadyApplied
                    }
                    className="mt-5 w-full rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
                  >
                    {applyingJob === job.id
                      ? "Applying..."
                      : alreadyApplied
                        ? "Applied"
                        : "Apply Now"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {applicationMessage && (
          <div className="mt-6 rounded-lg bg-gray-100 p-4">
            {applicationMessage}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Applications
          </h2>

          <div className="mt-3 space-y-3">
            {applications.map((application) => (
              <div
                key={application.id}
                className="rounded-lg bg-white p-4 shadow"
              >
                <h3 className="font-semibold">
                  {application.job_title}
                </h3>

                <p className="text-gray-600">
                  {application.company}
                </p>

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