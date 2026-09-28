"use client";

import { useEffect, useState } from "react";
import {
  authenticatedFetch,
  getAuthUser,
  logoutUser,
  type AuthUser,
} from "./auth";
import ProfileEditor from "./ProfileEditor";
import AuthScreen from "./AuthScreen";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

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

type InterviewQuestion = {
  skill: string;
  type: string;
  question: string;
};

type Notification = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
};

export default function Home() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [student, setStudent] = useState<Student | null>(null);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<Record<number, Match>>({});

  const [career, setCareer] = useState<CareerIntelligence | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [interviewQuestions, setInterviewQuestions] = useState<
    InterviewQuestion[]
  >([]);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [jobSearch, setJobSearch] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobType, setJobType] = useState("");

  const [selectedSkill, setSelectedSkill] = useState("");
  const [proficiency, setProficiency] = useState("Beginner");
  const [addingSkill, setAddingSkill] = useState(false);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");
  const [resumeScore, setResumeScore] = useState<any>(null);

  const [applyingJob, setApplyingJob] = useState<number | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");

  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const hour = new Date().getHours();

  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 17
        ? "Good afternoon"
        : "Good evening";

  async function loadDashboard(studentId: number) {
    setLoadingDashboard(true);

    try {
      const [
        studentResponse,
        skillResponse,
        allSkillResponse,
        applicationResponse,
        jobResponse,
        analyticsResponse,
        resumeScoreResponse,
        interviewResponse,
        notificationResponse,
      ] = await Promise.all([
        authenticatedFetch(`${API_URL}/students/`),
        authenticatedFetch(`${API_URL}/skills/student/${studentId}`),
        authenticatedFetch(`${API_URL}/skills/`),
        authenticatedFetch(
          `${API_URL}/applications/student/${studentId}`
        ),
        authenticatedFetch(
          `${API_URL}/jobs/?search=${encodeURIComponent(
            jobSearch
          )}&location=${encodeURIComponent(
            jobLocation
          )}&job_type=${encodeURIComponent(jobType)}`
        ),
        authenticatedFetch(
          `${API_URL}/analytics/student/${studentId}`
        ),
        authenticatedFetch(
          `${API_URL}/resumes/student/${studentId}/score`
        ),
        authenticatedFetch(
          `${API_URL}/interview/student/${studentId}`
        ),
        authenticatedFetch(`${API_URL}/notifications/`),
      ]);

      const studentData = await studentResponse.json();
      const skillData = await skillResponse.json();
      const allSkillData = await allSkillResponse.json();
      const applicationData = await applicationResponse.json();
      const jobData = await jobResponse.json();
      const analyticsData = await analyticsResponse.json();
      const resumeScoreData = await resumeScoreResponse.json();
      const interviewData = await interviewResponse.json();
      const notificationData = await notificationResponse.json();

      if (studentResponse.ok) {
        setStudent(
          studentData.students?.find(
            (item: Student) => item.id === studentId
          ) ?? null
        );
      }

      if (skillResponse.ok) {
        setSkills(skillData.skills ?? []);
      }

      if (allSkillResponse.ok) {
        setAllSkills(allSkillData.skills ?? []);
      }

      if (applicationResponse.ok) {
        setApplications(applicationData.applications ?? []);
      }

      if (jobResponse.ok) {
        setJobs(jobData.jobs ?? []);
      }

      if (analyticsResponse.ok && !analyticsData.detail) {
        setAnalytics(analyticsData);
      }

      if (resumeScoreResponse.ok && !resumeScoreData.detail) {
        setResumeScore(resumeScoreData);
      } else {
        setResumeScore(null);
      }

      if (
        interviewResponse.ok &&
        !interviewData.detail &&
        !interviewData.error
      ) {
        setInterviewQuestions(interviewData.questions ?? []);
      } else {
        setInterviewQuestions([]);
      }

      if (
        notificationResponse.ok &&
        !notificationData.detail
      ) {
        setNotifications(
          notificationData.notifications ?? []
        );
      } else {
        setNotifications([]);
      }

      try {
        const careerResponse = await authenticatedFetch(
          `${API_URL}/career/student/${studentId}`
        );

        if (careerResponse.ok) {
          const careerData = await careerResponse.json();
          setCareer(careerData);
        } else {
          setCareer(null);
        }
      } catch (error) {
        console.error("Career loading failed:", error);
        setCareer(null);
      }

      const currentJobs = jobData.jobs ?? [];

      const matchResults = await Promise.all(
        currentJobs.map(async (job: Job) => {
          try {
            const response = await authenticatedFetch(
              `${API_URL}/matching/student/${studentId}/job/${job.id}`
            );

            if (!response.ok) {
              return [
                job.id,
                {
                  match_percentage: 0,
                  matched_skills: [],
                  missing_skills: [],
                },
              ] as const;
            }

            const data = await response.json();

            return [job.id, data] as const;
          } catch {
            return [
              job.id,
              {
                match_percentage: 0,
                matched_skills: [],
                missing_skills: [],
              },
            ] as const;
          }
        })
      );

      setMatches(Object.fromEntries(matchResults));
    } catch (error) {
      console.error("Dashboard loading failed:", error);
    } finally {
      setLoadingDashboard(false);
    }
  }

  useEffect(() => {
    const user = getAuthUser();

    setAuthUser(user);

    if (user?.role === "admin") {
      window.location.href = "/admin";
      return;
    }

    if (user?.role === "recruiter") {
      window.location.href = "/recruiter";
      return;
    }

    if (user?.student_id) {
      loadDashboard(user.student_id);
    }
  }, []);

  async function addSkill() {
    if (!selectedSkill || !authUser?.student_id) {
      return;
    }

    setAddingSkill(true);

    try {
      const response = await authenticatedFetch(
        `${API_URL}/skills/student/${authUser.student_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skill_id: Number(selectedSkill),
            proficiency,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error("Skill add failed:", data);
        return;
      }

      setSelectedSkill("");
      setProficiency("Beginner");

      await loadDashboard(authUser.student_id);
    } catch (error) {
      console.error("Skill add failed:", error);
    } finally {
      setAddingSkill(false);
    }
  }

  async function uploadResume() {
    if (!resumeFile || !authUser?.student_id) {
      return;
    }

    setUploadingResume(true);
    setResumeMessage("");

    try {
      const formData = new FormData();

      formData.append("file", resumeFile);

      const response = await authenticatedFetch(
        `${API_URL}/resumes/student/${authUser.student_id}`,
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

        await loadDashboard(authUser.student_id);
      } else {
        setResumeMessage(
          data.detail || "Resume upload failed."
        );
      }
    } catch (error) {
      console.error("Resume upload failed:", error);
      setResumeMessage("Resume upload failed.");
    } finally {
      setUploadingResume(false);
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
        `${API_URL}/applications/`,
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
        setApplicationMessage(
          data.message || "Application submitted successfully."
        );

        await loadDashboard(authUser.student_id);
      } else {
        setApplicationMessage(
          data.detail || "Application failed."
        );
      }
    } catch (error) {
      console.error("Application failed:", error);
      setApplicationMessage("Application failed.");
    } finally {
      setApplyingJob(null);
    }
  }

  function handleLogout() {
    logoutUser();
    window.location.href = "/";
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
              total +
              (matches[job.id]?.match_percentage ?? 0),
            0
          ) / jobs.length
        )
      : 0;

  const studentName =
    student?.full_name ||
    authUser?.full_name ||
    "Student";

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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col p-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Placement AI
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Student Portal
              </p>
            </div>

            <nav className="mt-8 space-y-1">
              <a
                href="#dashboard"
                className="block rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold"
              >
                Dashboard
              </a>

              <a
                href="#resume"
                className="block rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Resume
              </a>

              <a
                href="#jobs"
                className="block rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Jobs
              </a>

              <a
                href="#applications"
                className="block rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Applications
              </a>

              <a
                href="#skills"
                className="block rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Skills
              </a>

              <a
                href="#interviews"
                className="block rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Interviews
              </a>

              <a
                href="#career"
                className="block rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Career Intelligence
              </a>

              <a
                href="#notifications"
                className="block rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Notifications
              </a>
            </nav>

            <div className="mt-auto border-t border-slate-200 pt-5">
              <p className="font-semibold">{studentName}</p>

              <p className="mt-1 break-all text-xs text-slate-500">
                {authUser.email}
              </p>

              <button
                onClick={handleLogout}
                className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
            {/* MOBILE HEADER */}
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <div>
                <h1 className="text-xl font-bold">
                  Placement AI
                </h1>

                <p className="text-xs text-slate-500">
                  Student Portal
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Logout
              </button>
            </div>

            {/* DASHBOARD HEADER */}
            <section id="dashboard" className="scroll-mt-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Student Dashboard
                </p>

                <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      {greeting}, {studentName}
                    </h2>

                    <p className="mt-2 text-slate-600">
                      Track your placement progress,
                      applications and career readiness.
                    </p>
                  </div>

                  {loadingDashboard && (
                    <span className="text-sm text-slate-500">
                      Updating...
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* STATISTICS */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Available Jobs
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {analytics?.total_jobs ?? jobs.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Applications
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {analytics?.applications_count ??
                    applications.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Skills
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {analytics?.skills_count ?? skills.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Average Job Match
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {averageMatch}%
                </p>
              </div>
            </section>

            {/* RESUME */}
            <section
              id="resume"
              className="mt-8 scroll-mt-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Resume
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      Resume Score
                    </h2>

                    <p className="mt-2 text-slate-600">
                      Improve your resume based on the
                      latest analysis.
                    </p>
                  </div>

                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <span className="text-2xl font-bold">
                      {resumeScore?.score != null
                        ? `${resumeScore.score}`
                        : "--"}
                    </span>
                  </div>
                </div>

                {resumeScore ? (
                  <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Skills
                        </p>

                        <p className="mt-1 font-semibold">
                          {resumeScore.breakdown?.skills ??
                            0}
                          /40
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Profile
                        </p>

                        <p className="mt-1 font-semibold">
                          {resumeScore.breakdown?.profile ??
                            0}
                          /20
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">
                          Content
                        </p>

                        <p className="mt-1 font-semibold">
                          {resumeScore.breakdown?.content ??
                            0}
                          /40
                        </p>
                      </div>
                    </div>

                    {resumeScore.recommendations?.length >
                      0 && (
                      <div className="mt-5">
                        <h3 className="font-semibold">
                          Recommendations
                        </h3>

                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                          {resumeScore.recommendations.map(
                            (item: string) => (
                              <li key={item}>{item}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    Upload a resume to calculate your
                    score.
                  </p>
                )}

                <div className="mt-6 border-t border-slate-200 pt-5">
                  <p className="mb-3 text-sm font-semibold">
                    Resume Intelligence
                  </p>

                  <p className="mb-4 text-sm text-slate-600">
                    Upload your latest PDF or TXT resume
                    to analyze skills and improve your
                    profile.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={(event) =>
                        setResumeFile(
                          event.target.files?.[0] ?? null
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />

                    <button
                      onClick={uploadResume}
                      disabled={
                        !resumeFile || uploadingResume
                      }
                      className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploadingResume
                        ? "Analyzing..."
                        : "Upload Resume"}
                    </button>
                  </div>

                  {resumeMessage && (
                    <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      {resumeMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* INTERVIEW */}
            <section
              id="interviews"
              className="mt-8 scroll-mt-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Interview Preparation
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Interview Questions
                </h2>

                <p className="mt-2 text-slate-600">
                  Practice questions based on your current
                  skills.
                </p>

                {interviewQuestions.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {interviewQuestions.map(
                      (item, index) => (
                        <div
                          key={`${item.skill}-${index}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold">
                              {index + 1}. {item.skill}
                            </h3>

                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-slate-500">
                              {item.type}
                            </span>
                          </div>

                          <p className="mt-3 text-sm text-slate-700">
                            {item.question}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    No interview questions available
                    yet.
                  </p>
                )}
              </div>
            </section>

            {/* JOBS */}
            <section id="jobs" className="mt-8 scroll-mt-6">
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-500">
                  Opportunities
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Recommended Jobs
                </h2>

                <p className="mt-2 text-slate-600">
                  Jobs ordered by your current skill
                  alignment.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    value={jobSearch}
                    onChange={(event) =>
                      setJobSearch(event.target.value)
                    }
                    placeholder="Search jobs or companies"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                  />

                  <input
                    value={jobLocation}
                    onChange={(event) =>
                      setJobLocation(event.target.value)
                    }
                    placeholder="Location"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
                  />

                  <select
                    value={jobType}
                    onChange={(event) =>
                      setJobType(event.target.value)
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  >
                    <option value="">
                      All job types
                    </option>
                    <option value="Internship">
                      Internship
                    </option>
                    <option value="Full-time">
                      Full-time
                    </option>
                    <option value="Part-time">
                      Part-time
                    </option>
                  </select>

                  <button
                    onClick={() => {
                      if (authUser.student_id) {
                        loadDashboard(
                          authUser.student_id
                        );
                      }
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Search Jobs
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {recommendedJobs.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p className="text-3xl font-bold">
                      0 opportunities
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      No jobs match your current search.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {recommendedJobs.map((job) => {
                      const match = matches[job.id];

                      if (!match) {
                        return null;
                      }

                      const alreadyApplied =
                        applications.some(
                          (application) =>
                            application.job_id === job.id
                        );

                      return (
                        <div
                          key={job.id}
                          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold">
                                {job.title}
                              </h3>

                              <p className="mt-1 text-slate-600">
                                {job.company}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
                              <p className="text-xl font-bold">
                                {match.match_percentage}%
                              </p>

                              <p className="text-xs text-slate-500">
                                Match
                              </p>
                            </div>
                          </div>

                          <p className="mt-4 text-sm text-slate-500">
                            {job.location || "Location not specified"}
                            {" � "}
                            {job.job_type ||
                              "Job type not specified"}
                          </p>

                          {job.description && (
                            <p className="mt-4 text-sm leading-6 text-slate-700">
                              {job.description}
                            </p>
                          )}

                          <div className="mt-5 border-t border-slate-200 pt-5">
                            <h4 className="font-semibold">
                              Your Skill Alignment
                            </h4>

                            <p className="mt-2 text-sm text-slate-600">
                              <strong>Matched:</strong>{" "}
                              {match.matched_skills
                                ?.length > 0
                                ? match.matched_skills.join(
                                    ", "
                                  )
                                : "None"}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                              <strong>Missing:</strong>{" "}
                              {match.missing_skills
                                ?.length > 0
                                ? match.missing_skills.join(
                                    ", "
                                  )
                                : "None"}
                            </p>
                          </div>

                          {match.missing_skills?.length >
                          0 ? (
                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                              <h4 className="font-semibold">
                                Skill Gap Analysis
                              </h4>

                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                                {match.missing_skills.map(
                                  (skill) => (
                                    <li key={skill}>
                                      Learn{" "}
                                      <strong>
                                        {skill}
                                      </strong>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-medium">
                              No current skill gaps
                              detected.
                            </div>
                          )}

                          <button
                            onClick={() =>
                              applyToJob(job.id)
                            }
                            disabled={
                              applyingJob === job.id ||
                              alreadyApplied
                            }
                            className="mt-5 w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                )}
              </div>
            </section>

            {applicationMessage && (
              <div className="mt-5 rounded-lg bg-slate-100 p-4 text-sm">
                {applicationMessage}
              </div>
            )}

            {/* APPLICATIONS */}
            <section
              id="applications"
              className="mt-8 scroll-mt-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Placement Activity
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Applications
                </h2>

                <p className="mt-2 text-slate-600">
                  Track the progress of your submitted
                  applications.
                </p>

                {applications.length === 0 ? (
                  <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    You have not submitted any
                    applications yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {applications.map((application) => {
                      const stages = [
                        "applied",
                        "shortlisted",
                        "interview",
                        "selected",
                      ];

                      const currentIndex =
                        stages.indexOf(
                          application.status
                        );

                      return (
                        <div
                          key={application.id}
                          className="rounded-xl border border-slate-200 p-5"
                        >
                          <h3 className="font-semibold">
                            {application.job_title}
                          </h3>

                          <p className="text-sm text-slate-500">
                            {application.company}
                          </p>

                          <div className="mt-5">
                            {application.status ===
                            "rejected" ? (
                              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                                Application Rejected
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-2">
                                {stages.map(
                                  (
                                    stage,
                                    index
                                  ) => (
                                    <div
                                      key={stage}
                                      className="text-center"
                                    >
                                      <div
                                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                          index <=
                                          currentIndex
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-200 text-slate-500"
                                        }`}
                                      >
                                        {index + 1}
                                      </div>

                                      <p className="mt-1 text-xs capitalize text-slate-600">
                                        {stage}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* SKILLS */}
            <section
              id="skills"
              className="mt-8 scroll-mt-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Profile Development
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Skills
                </h2>

                <p className="mt-2 text-slate-600">
                  Manage the technical skills used for job
                  matching.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {skills.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No skills added yet.
                    </p>
                  ) : (
                    skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-lg bg-slate-100 px-4 py-2 text-sm"
                      >
                        <strong>{skill.name}</strong>

                        {skill.proficiency && (
                          <span className="ml-2 text-slate-500">
                            {skill.proficiency}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-3 md:flex-row">
                  <select
                    value={selectedSkill}
                    onChange={(event) =>
                      setSelectedSkill(
                        event.target.value
                      )
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  >
                    <option value="">
                      Select skill
                    </option>

                    {availableSkills.map((skill) => (
                      <option
                        key={skill.id}
                        value={skill.id}
                      >
                        {skill.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={proficiency}
                    onChange={(event) =>
                      setProficiency(
                        event.target.value
                      )
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>

                  <button
                    onClick={addSkill}
                    disabled={
                      !selectedSkill || addingSkill
                    }
                    className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addingSkill
                      ? "Adding..."
                      : "Add Skill"}
                  </button>
                </div>
              </div>
            </section>

            {/* CAREER */}
            <section
              id="career"
              className="mt-8 scroll-mt-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Career Intelligence
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Career Readiness
                </h2>

                <p className="mt-2 text-slate-600">
                  Personalized career guidance based on
                  your profile and skills.
                </p>

                {career ? (
                  <>
                    <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Current readiness
                        </p>

                        <p className="mt-1 text-4xl font-bold">
                          {career.readiness_score}%
                        </p>

                        <p className="mt-1 font-semibold">
                          {career.readiness_level}
                        </p>
                      </div>

                      <div className="h-4 w-full max-w-md overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-slate-900"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                career.readiness_score
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-5">
                        <h3 className="font-semibold">
                          Suggested Career Paths
                        </h3>

                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                          {career.career_paths?.map(
                            (path) => (
                              <li key={path}>{path}</li>
                            )
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-5">
                        <h3 className="font-semibold">
                          Recommended Next Steps
                        </h3>

                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                          {career.recommendations?.map(
                            (item) => (
                              <li key={item}>{item}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    Career intelligence is not available
                    yet.
                  </p>
                )}
              </div>
            </section>

            {/* NOTIFICATIONS */}
            <section
              id="notifications"
              className="mt-8 scroll-mt-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Updates
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      Notifications
                    </h2>

                    <p className="mt-2 text-slate-600">
                      Recent updates from your placement
                      activity.
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                    {
                      notifications.filter(
                        (item) => !item.is_read
                      ).length
                    }{" "}
                    unread
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    No notifications yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {notifications
                      .slice(0, 10)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-4 ${
                            item.is_read
                              ? "bg-white"
                              : "bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!item.is_read && (
                              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
                            )}

                            <div>
                              <h3 className="font-semibold">
                                {item.title}
                              </h3>

                              <p className="mt-1 text-sm text-slate-600">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </section>

            {/* PROFILE */}
            {authUser.student_id && (
              <section className="mt-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Student Profile
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Keep your profile up to date
                  </h2>

                  <div className="mt-5">
                    <ProfileEditor
                      studentId={authUser.student_id}
                      onUpdated={() =>
                        loadDashboard(
                          authUser.student_id!
                        )
                      }
                    />
                  </div>
                </div>
              </section>
            )}

            <footer className="py-10 text-center text-sm text-slate-500">
              Placement AI � Student Career & Placement
              Platform
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
