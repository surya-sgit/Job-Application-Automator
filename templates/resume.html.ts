import { TailoredResume } from "@/lib/resumeSchema";

/**
 * Spacing-controlled, single-page resume template. Everything is driven by CSS
 * variables so the auto-fit routine can tighten spacing/fonts in steps without
 * touching markup. Designed for A4/Letter with generous-but-safe margins.
 */

export interface FitVars {
  base: number; // base font size (pt)
  line: number; // line-height
  gap: number; // section gap (pt)
  itemGap: number; // gap between bullets/items (pt)
}

export const FIT_STEPS: FitVars[] = [
  { base: 10.5, line: 1.35, gap: 12, itemGap: 4 },
  { base: 10.0, line: 1.3, gap: 10, itemGap: 3.5 },
  { base: 9.5, line: 1.25, gap: 8, itemGap: 3 },
  { base: 9.0, line: 1.2, gap: 7, itemGap: 2.5 },
  { base: 8.5, line: 1.15, gap: 6, itemGap: 2 },
];

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function contactLine(r: TailoredResume): string {
  const parts = [r.contact.email, r.contact.phone, r.contact.location, ...(r.contact.links || [])]
    .filter(Boolean)
    .map(esc);
  return parts.join(" &nbsp;•&nbsp; ");
}

function bullets(items: string[]): string {
  if (!items?.length) return "";
  return `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
}

export function renderResumeHtml(r: TailoredResume, fit: FitVars = FIT_STEPS[0]): string {
  const experience = (r.experience || [])
    .map(
      (e) => `
      <div class="item">
        <div class="item-head">
          <span class="strong">${esc(e.title)}</span>${e.company ? ` — ${esc(e.company)}` : ""}
          <span class="dates">${esc([e.start, e.end].filter(Boolean).join(" – "))}${
        e.location ? ` · ${esc(e.location)}` : ""
      }</span>
        </div>
        ${bullets(e.bullets)}
      </div>`
    )
    .join("");

  const projects = (r.projects || [])
    .map(
      (p) => `
      <div class="item">
        <div class="item-head">
          <span class="strong">${esc(p.title)}</span>${
        p.stack?.length ? ` <span class="stack">${esc(p.stack.join(", "))}</span>` : ""
      }
          ${p.link ? `<span class="dates">${esc(p.link)}</span>` : ""}
        </div>
        ${bullets(p.bullets)}
      </div>`
    )
    .join("");

  const education = (r.education || [])
    .map(
      (e) => `
      <div class="item edu">
        <span class="strong">${esc(e.school)}</span>${e.degree ? ` — ${esc(e.degree)}` : ""}
        <span class="dates">${esc(e.year || "")}</span>
      </div>`
    )
    .join("");

  const skills = (r.skills || []).length
    ? `<div class="section"><h2>Skills</h2><div class="skills">${r.skills
        .map(esc)
        .join(" &nbsp;·&nbsp; ")}</div></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root {
    --base: ${fit.base}pt;
    --line: ${fit.line};
    --gap: ${fit.gap}px;
    --item-gap: ${fit.itemGap}px;
    --ink: #1a1a1a;
    --muted: #555;
    --accent: #4f46e5;
  }
  * { box-sizing: border-box; }
  @page { size: A4; margin: 14mm 15mm; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Calibri", "Segoe UI", Arial, sans-serif;
    font-size: var(--base);
    line-height: var(--line);
    color: var(--ink);
  }
  .wrap { max-width: 100%; }
  header { text-align: center; margin-bottom: var(--gap); }
  header h1 { font-size: calc(var(--base) * 1.9); margin: 0; letter-spacing: 0.3px; }
  header .role { color: var(--accent); font-weight: 600; font-size: calc(var(--base) * 1.05); margin: 2px 0; }
  header .contact { color: var(--muted); font-size: calc(var(--base) * 0.9); }
  .section { margin-top: var(--gap); }
  h2 {
    font-size: calc(var(--base) * 1.02);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--accent);
    border-bottom: 1px solid #ddd;
    padding-bottom: 2px;
    margin: 0 0 calc(var(--item-gap) + 2px) 0;
  }
  .summary { margin: 0; }
  .item { margin-bottom: var(--item-gap); }
  .item-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px; }
  .strong { font-weight: 700; }
  .stack { color: var(--muted); font-style: italic; }
  .dates { margin-left: auto; color: var(--muted); font-size: calc(var(--base) * 0.88); white-space: nowrap; }
  ul { margin: 2px 0 0 0; padding-left: 16px; }
  li { margin: 0 0 1px 0; }
  .skills { }
  .edu { display: flex; align-items: baseline; gap: 4px; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${esc(r.name)}</h1>
      ${r.title ? `<div class="role">${esc(r.title)}</div>` : ""}
      <div class="contact">${contactLine(r)}</div>
    </header>

    ${r.summary ? `<div class="section"><h2>Summary</h2><p class="summary">${esc(r.summary)}</p></div>` : ""}
    ${skills}
    ${experience ? `<div class="section"><h2>Experience</h2>${experience}</div>` : ""}
    ${projects ? `<div class="section"><h2>Projects</h2>${projects}</div>` : ""}
    ${education ? `<div class="section"><h2>Education</h2>${education}</div>` : ""}
  </div>
</body>
</html>`;
}
