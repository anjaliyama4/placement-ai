"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch, getAuthUser, logoutUser, type AuthUser } from "./auth";
import ProfileEditor from "./ProfileEditor";
import AuthScreen from "./AuthScreen";

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
  readiness_score: number;
  readiness_level: string;
};

type Analytics = {
  student_id: number;
  student_name: string;
  total_jobs: number;
  skills_count: number;
  applications_count: number;
  application_status: Record<string, number>;
};

export default function Home() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<Record<number, Match>>({});
  const [career, setCareer] =
    useState<CareerIntelligence | null>(null);
  

  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [jobSearch, setJobSearch] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobType, setJobType] = useState("");

  const [selectedSkill, setSelectedSkill] = useState("");
  const [proficiency, setProficiency] = useState("Beginner");
  const [addingSkill, setAddingSkill] = useState(false);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");

  const [applyingJob, setApplyingJob] = useState<number | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");

  async function loadDashboard(studentId: number) {
    try {
      const [
        studentData,
        skillData,
        allSkillData,
        applicationData,
        jobData,
        analyticsData,
      ] = await Promise.all([
        authenticatedFetch("http://127.0.0.1:8001/students/").then((res) =>
          res.json()
        ),
        authenticatedFetch(`http://127.0.0.1:8001/skills/student/${studentId}`).then((res) =>
          res.json()
        ),
        authenticatedFetch("http://127.0.0.1:8001/skills/").then((res) =>
          res.json()
        ),
        authenticatedFetch(`http://127.0.0.1:8001/applications/student/${studentId}`).then(
          (res) => res.json()
        ),
        authenticatedFetch(`http://127.0.0.1:8001/jobs/?search=${encodeURIComponent(jobSearch)}&location=${encodeURIComponent(jobLocation)}&job_type=${encodeURIComponent(jobType)}`).then((res) =>
          res.json()
        ),
        authenticatedFetch(`http://127.0.0.1:8001/analytics/student/${studentId}`).then(
          (res) => res.json()
        ),
      ]);

      setStudent(studentData.students.find((item: Student) => item.id === studentId) ?? null);
      setSkills(skillData.skills ?? []);
      setAllSkills(allSkillData.skills ?? []);
      setApplications(applicationData.applications ?? []);
      setJobs(jobData.jobs ?? [])

      if (!analyticsData.detail) {
        setAnalytics(analyticsData);
      }

      const careerResponse = await authenticatedFetch(
        `http://127.0.0.1:8001/career/student/${studentId}`
      );

      if (careerResponse.ok) {
        const careerData = await careerResponse.json();
        setCareer(careerData);
      }

      const matchResults = await Promise.all(
        jobData.jobs.map(async (job: Job) => {
          const response = await authenticatedFetch(
            `http://127.0.0.1:8001/matching/student/${studentId}/job/${job.id}`
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
    const user = getAuthUser();
    setAuthUser(user);
    if (user?.student_id) {
      loadDashboard(user.student_id);
    }
  }, []);

  async function addSkill() {
    if (!selectedSkill) return;

    setAddingSkill(true);

    try {
      await authenticatedFetch(`http://127.0.0.1:8001/skills/student/${authUser?.student_id}`, {
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

      if (authUser?.student_id) {
        await loadDashboard(authUser.student_id);
      }
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

      const response = await authenticatedFetch(
        `http://127.0.0.1:8001/resumes/student/${authUser?.student_id}`,
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
        if (authUser?.student_id) {
        await loadDashboard(authUser.student_id);
      }
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

  async function updateApplicationStatus(applicationId: number, status: string) {
    try {
      const response = await authenticatedFetch(
        `http://127.0.0.1:8001/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setApplicationMessage(data.detail || "Status update failed.");
        return;
      }

      setApplicationMessage("Application status updated successfully.");
      if (authUser?.student_id) {
        await loadDashboard(authUser.student_id);
      }
    } catch (error) {
      console.error("Status update failed:", error);
      setApplicationMessage("Status update failed.");
    }
  }
  async function applyToJob(jobId: number) {
    if (!authUser?.student_id) {
      setApplicationMessage("Student profile not found.");
      return;
    }

    setApplyingJob(jobId);
    setApplicationMessage("");

    try {
      const response = await authenticatedFetch(
        "http://127.0.0.1:8001/applications/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: authUser.student_id,
            job_id: jobId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setApplicationMessage(data.message);
        await loadDashboard(authUser.student_id);
      } else {
        setApplicationMessage(data.detail || "Application failed.");
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

  const averageMatch =
    jobs.length > 0
      ? Math.round(
          jobs.reduce(
            (total, job) =>
              total + (matches[job.id]?.match_percentage ?? 0),
            0
          ) / jobs.length
        )
      : 0;

  if (!authUser) {
    return (
      <AuthScreen
        onAuthenticated={(user) => {
          setAuthUser(user);
          if (user.student_id) {
            loadDashboard(user.student_id);
          }
        }}
      />
    );
  }

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

        {authUser?.student_id && (
          <ProfileEditor
            studentId={authUser.student_id}
            onUpdated={() => loadDashboard(authUser.student_id!)}
          />
        )}

        {analytics && (
          <section className="mt-6">
            <h2 className="text-xl font-semibold">
              Placement Analytics
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">
                  Available Jobs
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {analytics.total_jobs}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">
                  Applications
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {analytics.applications_count}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">
                  Skills
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {analytics.skills_count}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">
                  Average Job Match
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {averageMatch}%
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white p-5 shadow">
              <h3 className="font-semibold">
                Application Status
              </h3>

              <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(
                  analytics.application_status
                ).map(([status, count]) => (
                  <div
                    key={status}
                    className="rounded-lg bg-gray-100 px-4 py-3"
                  >
                    <span className="font-medium capitalize">
                      {status}
                    </span>

                    <span className="ml-2 text-gray-600">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  AI Career Intelligence
                </h2>

                <p className="mt-2 text-gray-600">
                  Personalized career guidance based on your
                  current profile and skills.
                </p>
              </div>

              <div className="rounded-xl bg-gray-100 px-8 py-5 text-center">
                <p className="text-sm font-medium text-gray-500">
                  Career Readiness
                </p>

                <p className="mt-1 text-4xl font-bold">
                  {career.readiness_score}%
                </p>

                <p className="mt-1 font-semibold">
                  {career.readiness_level}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{
                  width: `${career.readiness_score}%`,
                }}
              />
            </div>

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

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder="Search jobs or companies"
              className="rounded-lg border px-4 py-2"
            />

            <input
              value={jobLocation}
              onChange={(e) => setJobLocation(e.target.value)}
              placeholder="Location"
              className="rounded-lg border px-4 py-2"
            />

            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="rounded-lg border px-4 py-2"
            >
              <option value="">All job types</option>
              <option value="Internship">Internship</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
            </select>
          </div>

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

          <div className="mt-3 space-y-3">{applications.map((application) => { const stages=["applied","shortlisted","interview","selected"]; const currentIndex=stages.indexOf(application.status); return (<div key={application.id} className="rounded-lg bg-white p-4 shadow"><h3 className="font-semibold">{application.job_title}</h3><p className="text-gray-600">{application.company}</p><div className="mt-4">{application.status==="rejected" ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">Application Rejected</div> : <div className="grid grid-cols-4 gap-2">{stages.map((stage,index)=><div key={stage} className="text-center"><div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index<=currentIndex ? "bg-black text-white" : "bg-gray-200 text-gray-500"}`}>{index+1}</div><p className="mt-1 text-xs capitalize">{stage}</p></div>)}</div>}</div><div className="mt-3 flex items-center gap-3"><span className="text-sm">Update:</span><select value={application.status} onChange={(e)=>updateApplicationStatus(application.id,e.target.value)} className="rounded border px-2 py-1 text-sm"><option value="applied">Applied</option><option value="shortlisted">Shortlisted</option><option value="interview">Interview</option><option value="selected">Selected</option><option value="rejected">Rejected</option></select></div></div>); })}</div>
        </section>
      </div>
    </main>
  );
}
























