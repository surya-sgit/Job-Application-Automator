"use client";

import type { TailoredResume } from "@/lib/resumeSchema";

/** On-screen preview of the tailored resume (mirrors the PDF template layout). */
export default function ResumePreview({ r }: { r: TailoredResume }) {
  const contact = [r.contact.email, r.contact.phone, r.contact.location, ...(r.contact.links || [])]
    .filter(Boolean)
    .join("  •  ");

  return (
    <div className="mx-auto max-w-[720px] bg-white p-8 text-[13px] leading-relaxed text-slate-800 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{r.name}</h1>
        {r.title && <div className="font-semibold text-brand">{r.title}</div>}
        <div className="text-xs text-slate-500">{contact}</div>
      </div>

      {r.summary && (
        <Section title="Summary">
          <p>{r.summary}</p>
        </Section>
      )}

      {r.skills?.length > 0 && (
        <Section title="Skills">
          <div className="text-slate-600">{r.skills.join("  ·  ")}</div>
        </Section>
      )}

      {r.experience?.length > 0 && (
        <Section title="Experience">
          {r.experience.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-bold">{e.title}</span>
                {e.company && <span>— {e.company}</span>}
                <span className="ml-auto text-xs text-slate-500">
                  {[e.start, e.end].filter(Boolean).join(" – ")}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </div>
              <Bullets items={e.bullets} />
            </div>
          ))}
        </Section>
      )}

      {r.projects?.length > 0 && (
        <Section title="Projects">
          {r.projects.map((p, i) => (
            <div key={i} className="mb-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-bold">{p.title}</span>
                {p.stack?.length > 0 && (
                  <span className="italic text-slate-500">{p.stack.join(", ")}</span>
                )}
                {p.link && <span className="ml-auto text-xs text-slate-500">{p.link}</span>}
              </div>
              <Bullets items={p.bullets} />
            </div>
          ))}
        </Section>
      )}

      {r.education?.length > 0 && (
        <Section title="Education">
          {r.education.map((e, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-bold">{e.school}</span>
              {e.degree && <span>— {e.degree}</span>}
              <span className="ml-auto text-xs text-slate-500">{e.year}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h2 className="mb-1 border-b border-slate-200 pb-0.5 text-xs font-semibold uppercase tracking-wide text-brand">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-0.5 list-disc pl-5">
      {items.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}
