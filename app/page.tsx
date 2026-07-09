"use client";

import { useState } from "react";
import ResumePreview from "@/components/ResumePreview";
import type { JdAnalysis, TailoredResume } from "@/lib/resumeSchema";

interface Matched {
  id: string;
  title: string;
  score: number;
  matched: string[];
}

type Step = "input" | "questions" | "resume";

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [jd, setJd] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [analysis, setAnalysis] = useState<JdAnalysis | null>(null);
  const [matched, setMatched] = useState<Matched[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<TailoredResume | null>(null);

  // email panel
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendResult, setSendResult] = useState("");

  async function post(url: string, payload: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  // Step 1+2+questions: analyze JD → match projects locally → get questions.
  async function startTailoring() {
    setError("");
    setSendResult("");
    try {
      setBusy("Analyzing job description…");
      const a = await post("/api/analyze", { jd });
      setAnalysis(a.analysis);

      setBusy("Matching your projects (local, 0 tokens)…");
      const m = await post("/api/match", { analysis: a.analysis, topN: 4 });
      setMatched(m.selected);
      setProjects(m.projects);

      setBusy("Preparing clarifying questions…");
      const q = await post("/api/tailor", {
        action: "questions",
        analysis: a.analysis,
        projects: m.projects,
      });
      setQuestions(q.questions);
      setAnswers(Object.fromEntries(q.questions.map((x: string) => [x, ""])));
      setStep("questions");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  // Generate the tailored resume from answers.
  async function generateResume() {
    setError("");
    try {
      setBusy("Writing your tailored resume…");
      const r = await post("/api/tailor", {
        action: "generate",
        analysis,
        projects,
        answers,
      });
      setResume(r.resume);
      setStep("resume");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function downloadPdf() {
    if (!resume) return;
    setError("");
    setBusy("Rendering PDF…");
    try {
      const res = await fetch("/api/resume/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });
      if (!res.ok) throw new Error((await res.json()).error || "PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(resume.name || "resume").replace(/[^a-z0-9]+/gi, "_")}_resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function draftEmail() {
    if (!resume || !analysis) return;
    setError("");
    setBusy("Drafting email…");
    try {
      const d = await post("/api/email/draft", { analysis, resume, company });
      setSubject(d.draft.subject);
      setBody(d.draft.body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function sendEmail() {
    if (!resume) return;
    setError("");
    setSendResult("");
    setBusy("Sending…");
    try {
      await post("/api/email/send", { to, subject, body, resume });
      setSendResult(`✅ Sent to ${to} with your resume attached.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  function reset() {
    setStep("input");
    setAnalysis(null);
    setMatched([]);
    setProjects([]);
    setQuestions([]);
    setAnswers({});
    setResume(null);
    setSubject("");
    setBody("");
    setSendResult("");
    setError("");
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["input", "questions", "resume"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === s ? "bg-brand text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={step === s ? "font-medium" : "text-slate-400"}>
              {s === "input" ? "Job description" : s === "questions" ? "Questions" : "Resume & email"}
            </span>
            {i < 2 && <span className="text-slate-300">→</span>}
          </div>
        ))}
      </div>

      {busy && (
        <div className="rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand-dark">{busy}</div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* STEP 1: JD input */}
      {step === "input" && (
        <div className="card space-y-4">
          <h1 className="text-xl font-bold">Paste a job description</h1>
          <textarea
            className="input min-h-[240px] font-mono text-sm"
            placeholder="Paste the full job description here…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Company name (optional, for the email)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            disabled={!!busy || jd.trim().length < 20}
            onClick={startTailoring}
          >
            Tailor Resume →
          </button>
          <p className="text-xs text-slate-400">
            Make sure your <a className="text-brand underline" href="/profile">profile</a> and{" "}
            <a className="text-brand underline" href="/settings">AI settings</a> are filled first.
          </p>
        </div>
      )}

      {/* STEP 2: matched projects + questions */}
      {step === "questions" && (
        <div className="space-y-6">
          {analysis && (
            <div className="card space-y-3">
              <h2 className="font-semibold">What we found in the JD</h2>
              <div className="flex flex-wrap gap-1.5">
                {analysis.hardSkills.map((s) => (
                  <span key={s} className="chip">{s}</span>
                ))}
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-600">
                  Projects auto-selected for this role (matched locally, no tokens):
                </p>
                <div className="flex flex-wrap gap-2">
                  {matched.length === 0 && (
                    <span className="text-sm text-slate-400">
                      No projects in your profile yet — add some for better tailoring.
                    </span>
                  )}
                  {matched.map((m) => (
                    <span
                      key={m.id}
                      className="rounded-lg border border-brand/30 bg-brand/5 px-2.5 py-1 text-sm"
                      title={`matched: ${m.matched.join(", ")}`}
                    >
                      {m.title} <span className="text-xs text-slate-400">· score {m.score}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card space-y-4">
            <h2 className="font-semibold">A few quick questions</h2>
            <p className="text-sm text-slate-500">
              Answer what you can — blanks are fine. These sharpen the tailoring.
            </p>
            {questions.map((q) => (
              <div key={q}>
                <label className="label">{q}</label>
                <textarea
                  className="input min-h-[52px]"
                  value={answers[q] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex gap-3">
              <button className="btn-primary" disabled={!!busy} onClick={generateResume}>
                Generate tailored resume →
              </button>
              <button className="btn-ghost" onClick={reset}>
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: resume + email */}
      {step === "resume" && resume && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Tailored resume</h2>
              <div className="flex gap-2">
                <button className="btn-primary" disabled={!!busy} onClick={downloadPdf}>
                  ⬇ Download PDF
                </button>
                <button className="btn-ghost" onClick={reset}>
                  New JD
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
              <ResumePreview r={resume} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="card space-y-4">
              <h2 className="font-semibold">Email to HR</h2>
              <div>
                <label className="label">Recipient (HR / company email)</label>
                <input
                  className="input"
                  type="email"
                  placeholder="hr@company.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <button className="btn-ghost" disabled={!!busy} onClick={draftEmail}>
                ✨ Draft with AI
              </button>
              <div>
                <label className="label">Subject</label>
                <input
                  className="input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Body</label>
                <textarea
                  className="input min-h-[200px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <button
                className="btn-primary"
                disabled={!!busy || !to || !subject || !body}
                onClick={sendEmail}
              >
                📧 Send with resume attached
              </button>
              {sendResult && <p className="text-sm text-green-700">{sendResult}</p>}
              <p className="text-xs text-slate-400">
                Sends from your Gmail (configured in Settings). The PDF is attached automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
