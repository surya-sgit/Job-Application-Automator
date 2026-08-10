"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/clientFetch";
import type { Profile, Project, Experience, Education } from "@/lib/resumeSchema";
import LayoutManager from "@/components/LayoutManager";

const EMPTY: Profile = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  summary: "",
  skills: [],
  certifications: [],
  achievements: [],
  projects: [],
  experience: [],
  education: [],
  latexTemplate: "",
  defaultResumeLayout: ["summary", "experience", "projects", "skills", "education", "certifications", "achievements"],
  hiddenSections: [],
};

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

type SkillGroup = { category: string, items: string[] };

function arrayToStr(arr: SkillGroup[] = []): string {
  return arr.map(g => `${g.category}:\n${g.items.join(", ")}`).join("\n\n");
}

function strToArray(str: string): SkillGroup[] {
  const arr: SkillGroup[] = [];
  const blocks = str.split(/\n\n+/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.trim().split("\n");
    if (lines.length === 1) {
      const existing = arr.find(a => a.category === "Other");
      const items = lines[0].split(",").map(s => s.trim()).filter(Boolean);
      if (existing) existing.items.push(...items);
      else arr.push({ category: "Other", items });
    } else {
      let cat = lines[0].replace(/:$/, "").trim();
      if (!cat) cat = "Other";
      const items = lines.slice(1).join(" ").split(",").map(s => s.trim()).filter(Boolean);
      const existing = arr.find(a => a.category === cat);
      if (existing) existing.items.push(...items);
      else arr.push({ category: cat, items });
    }
  }
  return arr;
}

function mergeArrays(a: SkillGroup[] = [], b: SkillGroup[] = []): SkillGroup[] {
  const res: SkillGroup[] = JSON.parse(JSON.stringify(a));
  for (const group of b) {
    const existing = res.find(r => r.category === group.category);
    if (existing) {
      existing.items = dedupeStrings([...existing.items, ...group.items]);
    } else {
      res.push(group);
    }
  }
  return res;
}

// Parse comma / newline separated text into a trimmed array.
const toList = (s: string) =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

const norm = (s: string) => s.trim().toLowerCase();

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = norm(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

interface MergeSummary {
  projects: number;
  experience: number;
  education: number;
}

/**
 * Merges freshly-parsed resume data into the existing profile as an edit,
 * not a replace: blank scalar fields get filled in, lists get deduped and
 * appended to, and only genuinely new projects/experience/education entries
 * (by title / company+title / school+degree) are added.
 */
function mergeProfile(
  existing: Profile,
  parsed: Profile,
  replaceBasics: boolean
): { profile: Profile; summary: MergeSummary } {
  let summary = { projects: 0, experience: 0, education: 0 };
  
  const newProjects = parsed.projects.filter(
    (np) => !existing.projects.some((ep) => norm(ep.title) === norm(np.title))
  );
  summary.projects = newProjects.length;

  const newExp = parsed.experience.filter(
    (ne) => !existing.experience.some((ee) => norm(ee.company) === norm(ne.company) && norm(ee.title) === norm(ne.title))
  );
  summary.experience = newExp.length;

  const newEdu = parsed.education.filter(
    (ne) => !existing.education.some((ee) => norm(ee.school) === norm(ne.school) && norm(ee.degree) === norm(ne.degree))
  );
  summary.education = newEdu.length;

  return {
    profile: {
      ...existing,
      ...(replaceBasics ? {
        name: parsed.name || existing.name,
        title: parsed.title || existing.title,
        email: parsed.email || existing.email,
        phone: parsed.phone || existing.phone,
        location: parsed.location || existing.location,
        links: dedupeStrings([...existing.links, ...parsed.links]),
        summary: parsed.summary || existing.summary,
      } : {}),
      skills: mergeArrays(existing.skills as any, parsed.skills as any),
      certifications: dedupeStrings([...existing.certifications, ...parsed.certifications]),
      achievements: dedupeStrings([...existing.achievements, ...parsed.achievements]),
      projects: [...existing.projects, ...newProjects],
      experience: [...existing.experience, ...newExp],
      education: [...existing.education, ...newEdu],
    },
    summary
  };
}

// ---- Components to manage local text state for arrays to prevent cursor jumping ----

function TextInput({ value, onChange, placeholder, className = "input w-full" }: { value: string, onChange: (val: string) => void, placeholder?: string, className?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (value !== local) setLocal(value);
  }, [value]);
  return <input className={className} placeholder={placeholder} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(local)} />;
}

function TextAreaInput({ value, onChange, placeholder, className = "input w-full" }: { value: string, onChange: (val: string) => void, placeholder?: string, className?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (value !== local) setLocal(value);
  }, [value]);
  return <textarea className={className} placeholder={placeholder} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(local)} />;
}

function ArrayInput({ value, onChange, placeholder }: { value: string[], onChange: (val: string[]) => void, placeholder: string }) {
  const [local, setLocal] = useState(value.join(", "));
  useEffect(() => {
    if (value.join(", ") !== local.split(/[\n,]/).map(x => x.trim()).filter(Boolean).join(", ")) {
      setLocal(value.join(", "));
    }
  }, [value]);
  return <input className="input" placeholder={placeholder} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(local.split(/[\n,]/).map(x => x.trim()).filter(Boolean))} />;
}

function ArrayTextarea({ value, onChange, placeholder, minH = "70px" }: { value: string[], onChange: (val: string[]) => void, placeholder: string, minH?: string }) {
  const [local, setLocal] = useState(value.join("\n"));
  useEffect(() => {
    if (value.join("\n") !== local.split("\n").map(x => x.trim()).filter(Boolean).join("\n")) {
      setLocal(value.join("\n"));
    }
  }, [value]);
  return <textarea className={`input min-h-[${minH}]`} placeholder={placeholder} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(local.split("\n").map(x => x.trim()).filter(Boolean))} />;
}

function SkillsTextarea({ value, onChange }: { value: SkillGroup[], onChange: (val: SkillGroup[]) => void }) {
  const [local, setLocal] = useState(arrayToStr(value));
  useEffect(() => {
    const currentParsed = strToArray(local);
    if (JSON.stringify(value) !== JSON.stringify(currentParsed)) {
      setLocal(arrayToStr(value));
    }
  }, [value]);
  return <textarea className="input min-h-[120px]" placeholder={"Programming:\nPython, SQL\n\nTools:\nDocker, Git"} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(strToArray(local))} />;
}

export default function ProfilePage() {
  const [p, setP] = useState<Profile>(EMPTY);
  const [initialP, setInitialP] = useState<Profile>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [replaceBasics, setReplaceBasics] = useState(false);

  const [loadError, setLoadError] = useState("");

  function load() {
    setLoadError("");
    fetchJson<Profile>("/api/profile")
      .then((data) => {
        setP({ ...EMPTY, ...data });
        setInitialP({ ...EMPTY, ...data });
        setLoaded(true);
      })
      .catch((e: Error) => setLoadError(e.message));
  }

  useEffect(load, []);

  function set<K extends keyof Profile>(key: K, val: Profile[K]) {
    setP((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    setSaving(true);
    setMsg("Checking for changes to projects...");
    try {
      const { getEmbedding, hashText } = await import("@/lib/embeddingsClient");
      
      const newProjects = [...p.projects];
      for (let i = 0; i < newProjects.length; i++) {
        const proj = newProjects[i];
        const text = [proj.title, proj.role, proj.stack.join(" "), proj.description, proj.bullets.join(" ")].join(" ");
        const currentHash = await hashText(text);
        
        if (proj.contentHash !== currentHash || !proj.embedding || proj.embedding.length === 0) {
           setMsg(`Generating semantic embeddings for project ${i+1} of ${newProjects.length}... (this happens locally in your browser!)`);
           const embedding = await getEmbedding(text);
           newProjects[i] = { ...proj, contentHash: currentHash, embedding };
        }
      }
      
      const toSave = { ...p, projects: newProjects };
      setP(toSave);
      
      setMsg("Saving profile...");
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        setMsg("Profile saved.");
        setInitialP(toSave);
      } else {
        setMsg("Failed to save.");
      }
    } catch(err) {
      console.error(err);
      setMsg("Failed to save: " + String(err));
    }
    setSaving(false);
  }

  async function importResume() {
    setImportError("");
    setImportMsg("");
    setImportBusy(true);
    try {
      let res: Response;
      if (importMode === "file") {
        if (!importFile) {
          setImportError("Choose a file first.");
          setImportBusy(false);
          return;
        }
        const form = new FormData();
        form.append("file", importFile);
        res = await fetch("/api/profile/parse", { method: "POST", body: form });
      } else {
        if (importText.trim().length < 40) {
          setImportError("Paste more of your resume text first.");
          setImportBusy(false);
          return;
        }
        res = await fetch("/api/profile/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: importText }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Couldn't parse that resume.");
        return;
      }
      const parsed: Profile = { ...EMPTY, ...data.profile };
      const { profile: merged, summary } = mergeProfile(p, parsed, replaceBasics);
      setP(merged);

      const parts = [
        summary.projects && `${summary.projects} new project(s)`,
        summary.experience && `${summary.experience} new experience entr${summary.experience === 1 ? "y" : "ies"}`,
        summary.education && `${summary.education} new education entr${summary.education === 1 ? "y" : "ies"}`,
      ].filter(Boolean);
      const addedText = parts.length ? `Added ${parts.join(", ")}.` : "No new projects/experience/education found.";
      const tokenText = data.usage?.totalTokens ? ` (~${data.usage.totalTokens} tokens)` : "";
      setImportMsg(`${addedText}${tokenText} Review below, then click Save profile.`);
    } catch {
      setImportError("Couldn't parse that resume.");
    } finally {
      setImportBusy(false);
    }
  }

  // ---- project helpers ----
  const addProject = () =>
    set("projects", [
      ...p.projects,
      { id: uid(), title: "", role: "", stack: [], description: "", bullets: [], link: "" },
    ]);
  const updateProject = (id: string, patch: Partial<Project>) =>
    set("projects", p.projects.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeProject = (id: string) =>
    set("projects", p.projects.filter((x) => x.id !== id));

  // ---- experience helpers ----
  const addExp = () =>
    set("experience", [
      ...p.experience,
      { id: uid(), company: "", title: "", location: "", start: "", end: "", bullets: [] },
    ]);
  const updateExp = (id: string, patch: Partial<Experience>) =>
    set("experience", p.experience.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeExp = (id: string) =>
    set("experience", p.experience.filter((x) => x.id !== id));

  // ---- education helpers ----
  const addEdu = () =>
    set("education", [...p.education, { id: uid(), school: "", degree: "", year: "", details: "" }]);
  const updateEdu = (id: string, patch: Partial<Education>) =>
    set("education", p.education.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeEdu = (id: string) =>
    set("education", p.education.filter((x) => x.id !== id));

  if (loadError)
    return (
      <div className="card max-w-md space-y-3">
        <p className="text-sm text-red-700">Couldn&apos;t load your profile: {loadError}</p>
        <button className="btn-ghost" onClick={load}>
          Retry
        </button>
      </div>
    );
  if (!loaded) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <p className="text-sm text-slate-500">
          Fill this once. Add all your projects — the tool automatically picks the ones that match
          each job description.
        </p>
      </div>

      {/* Import from resume */}
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold">Import from an existing resume</h2>
          <p className="text-sm text-slate-500">
            Upload a resume or paste its text — AI merges it into your profile below using your
            own API key (configured in Settings). Existing entries are kept; new projects,
            experience, and education are added alongside them. Nothing is saved until you click
            Save profile.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className={importMode === "file" ? "btn-primary" : "btn-ghost"}
            onClick={() => setImportMode("file")}
          >
            Upload file
          </button>
          <button
            className={importMode === "paste" ? "btn-primary" : "btn-ghost"}
            onClick={() => setImportMode("paste")}
          >
            Paste text
          </button>
        </div>
        {importMode === "file" ? (
          <input
            className="input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
        ) : (
          <textarea
            className="input min-h-[140px] font-mono text-sm"
            placeholder="Paste your resume text here…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={replaceBasics}
            onChange={(e) => setReplaceBasics(e.target.checked)}
          />
          Also replace basic info (name, title, contact, summary) with the parsed values
        </label>
        <button className="btn-primary" onClick={importResume} disabled={importBusy}>
          {importBusy ? "Parsing…" : "Parse & merge into profile"}
        </button>
        {importError && <p className="text-sm text-red-600">{importError}</p>}
        {importMsg && <p className="text-sm text-green-700">{importMsg}</p>}
      </div>

      {/* Basics */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Basics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <TextInput className="input" value={p.name} onChange={(v) => set("name", v)} />
          </div>
          <div>
            <label className="label">Headline / title</label>
            <TextInput className="input" value={p.title} onChange={(v) => set("title", v)} />
          </div>
          <div>
            <label className="label">Email</label>
            <TextInput className="input" value={p.email} onChange={(v) => set("email", v)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <TextInput className="input" value={p.phone} onChange={(v) => set("phone", v)} />
          </div>
          <div>
            <label className="label">Location</label>
            <TextInput
              className="input"
              value={p.location}
              onChange={(v) => set("location", v)}
            />
          </div>
          <div>
            <label className="label">Links (comma separated)</label>
            <ArrayInput
              placeholder="github.com/you, linkedin.com/in/you"
              value={p.links}
              onChange={(val) => set("links", val)}
            />
          </div>
        </div>
        <div>
          <label className="label">Professional summary</label>
          <TextAreaInput
            className="input min-h-[80px]"
            value={p.summary}
            onChange={(v) => set("summary", v)}
          />
        </div>
        <div>
          <label className="label">Skills (grouped by category)</label>
          <p className="text-xs text-muted-foreground mb-2">
            This is your single source of truth for skill categories. The AI will never invent new categories when tailoring your resume, it will only use these exact categories.
          </p>
          <SkillsTextarea
            value={p.skills as any}
            onChange={(val) => set("skills", val)}
          />
        </div>
      </div>

      {/* Projects */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Projects ({p.projects.length})</h2>
          <button className="btn-ghost" onClick={addProject}>
            + Add project
          </button>
        </div>
        {p.projects.length === 0 && (
          <p className="text-sm text-slate-400">No projects yet. Add a few — the more the better.</p>
        )}
        {p.projects.map((proj) => (
          <div key={proj.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                className="input"
                placeholder="Project title"
                value={proj.title}
                onChange={(v) => updateProject(proj.id, { title: v })}
              />
              <TextInput
                className="input"
                placeholder="Your role (optional)"
                value={proj.role}
                onChange={(v) => updateProject(proj.id, { role: v })}
              />
            </div>
            <ArrayInput
              placeholder="Tech stack (comma separated)"
              value={proj.stack}
              onChange={(val) => updateProject(proj.id, { stack: val })}
            />
            <TextAreaInput
              className="input min-h-[50px]"
              placeholder="Short description"
              value={proj.description}
              onChange={(v) => updateProject(proj.id, { description: v })}
            />
            <ArrayTextarea
              placeholder="Bullet points (one per line)"
              value={proj.bullets}
              onChange={(val) => updateProject(proj.id, { bullets: val })}
            />
            <div className="flex items-center gap-3">
              <TextInput
                className="input w-full"
                placeholder="Link (optional)"
                value={proj.link}
                onChange={(v) => updateProject(proj.id, { link: v })}
              />
              <button
                className="btn-ghost text-red-600"
                onClick={() => removeProject(proj.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Experience */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Experience ({p.experience.length})</h2>
          <button className="btn-ghost" onClick={addExp}>
            + Add experience
          </button>
        </div>
        {p.experience.map((exp) => (
          <div key={exp.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                className="input"
                placeholder="Company"
                value={exp.company}
                onChange={(v) => updateExp(exp.id, { company: v })}
              />
              <TextInput
                className="input"
                placeholder="Job title"
                value={exp.title}
                onChange={(v) => updateExp(exp.id, { title: v })}
              />
              <TextInput
                className="input"
                placeholder="Start (e.g. Jan 2022)"
                value={exp.start}
                onChange={(v) => updateExp(exp.id, { start: v })}
              />
              <TextInput
                className="input"
                placeholder="End (e.g. Present)"
                value={exp.end}
                onChange={(v) => updateExp(exp.id, { end: v })}
              />
            </div>
            <ArrayTextarea
              placeholder="Bullet points (one per line)"
              value={exp.bullets}
              onChange={(val) => updateExp(exp.id, { bullets: val })}
            />
            <button className="btn-ghost text-red-600" onClick={() => removeExp(exp.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Education */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Education ({p.education.length})</h2>
          <button className="btn-ghost" onClick={addEdu}>
            + Add education
          </button>
        </div>
        {p.education.map((edu) => (
          <div key={edu.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextInput
                className="input"
                placeholder="School"
                value={edu.school}
                onChange={(v) => updateEdu(edu.id, { school: v })}
              />
              <TextInput
                className="input"
                placeholder="Degree"
                value={edu.degree}
                onChange={(v) => updateEdu(edu.id, { degree: v })}
              />
              <TextInput
                className="input"
                placeholder="Year"
                value={edu.year}
                onChange={(v) => updateEdu(edu.id, { year: v })}
              />
            </div>
            <TextAreaInput
              className="input min-h-[50px]"
              placeholder="Details (e.g. CGPA, awards, minor)"
              value={edu.details || ""}
              onChange={(v) => updateEdu(edu.id, { details: v })}
            />
            <button className="btn-ghost text-red-600" onClick={() => removeEdu(edu.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Certifications</h2>
        </div>
        <ArrayTextarea
          placeholder="Certifications (one per line)"
          value={p.certifications}
          onChange={(val) => set("certifications", val)}
        />
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Achievements</h2>
        </div>
        <ArrayTextarea
          placeholder="Achievements (one per line)"
          value={p.achievements}
          onChange={(val) => set("achievements", val)}
        />
      </div>

      {/* Global Resume Layout */}
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold">Default Resume Layout</h2>
          <p className="text-sm text-slate-500">
            Drag to reorder sections. Use the eye icon to hide sections globally. You can always override this layout on a per-application basis when generating a tailored resume.
          </p>
        </div>
        <LayoutManager
          layout={p.defaultResumeLayout || ["summary", "experience", "projects", "skills", "education", "certifications", "achievements"]}
          hiddenSections={p.hiddenSections || []}
          onChange={(layout, hiddenSections) => {
            setP({ ...p, defaultResumeLayout: layout, hiddenSections });
          }}
        />
      </div>

      {/* LaTeX Template */}
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold">LaTeX Template (Optional)</h2>
          <p className="text-sm text-slate-500">
            Paste your raw `.tex` resume code here. If provided, you can choose to generate a tailored LaTeX file instead of the standard PDF.
          </p>
        </div>
        <TextAreaInput
          className="input min-h-[300px] font-mono text-xs whitespace-pre"
          value={p.latexTemplate}
          onChange={(v) => set("latexTemplate", v)}
          placeholder="\documentclass{article}&#10;\begin{document}&#10;..."
        />
      </div>

      <div className="sticky bottom-8 mt-12 flex justify-center w-full z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-3 pointer-events-auto">
          <button 
            className="btn-primary rounded-full px-10 shadow-[0_0_30px_rgba(139,92,246,0.3)] border-brand-400/50 disabled:opacity-50" 
            onClick={save} 
            disabled={saving || JSON.stringify(p) === JSON.stringify(initialP)}
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
          {msg && <span className="text-sm font-medium text-brand-300 bg-dark-900/80 px-4 py-1 rounded-full border border-brand-500/20 backdrop-blur-md shadow-xl">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
