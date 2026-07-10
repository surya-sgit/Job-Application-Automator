import { JdAnalysis, Profile, Project } from "./resumeSchema";

/**
 * Prompts are deliberately terse. We never send the whole profile to the paid
 * model — only the JD analysis + the matched project subset + trimmed
 * experience/skills. This keeps token usage low.
 */

export const ANALYZE_SYSTEM =
  "You extract structured hiring signals from a job description. " +
  "Return ONLY the requested fields. Be concise: short skill/keyword tokens, not sentences.";

export function analyzeUser(jd: string): string {
  return `Job description:\n"""\n${jd.slice(0, 6000)}\n"""\n\nExtract the job title, seniority, hard skills, soft skills, ATS keywords, and key responsibilities.`;
}

export const RESUME_PARSE_SYSTEM =
  "You extract structured profile data from a resume/CV. Return ONLY the requested " +
  "fields: name, headline, contact info, links, summary, skills, projects, experience, " +
  "education. Preserve the resume's own wording for bullets. Never invent employers, " +
  "dates, degrees, or accomplishments not in the text. Leave a field empty if absent.";

export function resumeParseUser(text: string): string {
  return `Resume text:\n"""\n${text.slice(0, 20000)}\n"""\n\nExtract the structured profile now.`;
}

export const QUESTIONS_SYSTEM =
  "You are a resume-tailoring assistant. Given a JD analysis and the candidate's " +
  "relevant material, ask 3-6 short, specific clarifying questions whose answers " +
  "would most improve tailoring (e.g. metrics, missing skills, preferences). " +
  "Do NOT ask for info already present. Keep each question one line.";

export const TAILOR_SYSTEM =
  "You are an expert resume writer and ATS optimizer. Rewrite the candidate's " +
  "material into a tailored, single-page resume for the target job. Rules: " +
  "use strong action verbs and quantified impact; mirror the JD's keywords " +
  "naturally; keep bullets to one line each (<= ~110 chars); do NOT invent " +
  "employers, degrees, or dates; only rephrase/emphasize what is provided plus " +
  "the user's answers. Keep total content tight enough for one page.";

/** Compact context object sent to the tailor agent (agent 3). */
export function tailorContext(
  analysis: JdAnalysis,
  profile: Profile,
  matchedProjects: Project[],
  answers?: Record<string, string>
): string {
  const compactProfile = {
    name: profile.name,
    title: profile.title,
    contact: {
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      links: profile.links,
    },
    summary: profile.summary,
    skills: profile.skills,
    experience: profile.experience.map((e) => ({
      company: e.company,
      title: e.title,
      location: e.location,
      start: e.start,
      end: e.end,
      bullets: e.bullets,
    })),
    education: profile.education.map((e) => ({
      school: e.school,
      degree: e.degree,
      year: e.year,
    })),
  };

  const projects = matchedProjects.map((p) => ({
    title: p.title,
    stack: p.stack,
    description: p.description,
    bullets: p.bullets,
    link: p.link,
  }));

  return [
    `TARGET JOB ANALYSIS:\n${JSON.stringify(analysis)}`,
    `CANDIDATE (relevant subset only):\n${JSON.stringify(compactProfile)}`,
    `MATCHED PROJECTS:\n${JSON.stringify(projects)}`,
    answers && Object.keys(answers).length
      ? `USER ANSWERS TO CLARIFYING QUESTIONS:\n${JSON.stringify(answers)}`
      : "",
    "Produce the tailored resume now.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const EMAIL_SYSTEM =
  "You write concise, professional job-application emails to a recruiter/HR. " +
  "3-5 short sentences. Warm but not fluffy. Reference the specific role and 1-2 " +
  "of the strongest, most relevant qualifications. End with a call to action. " +
  "Do NOT include placeholders like [Name] — use the provided details or omit.";

export function emailUser(args: {
  jobTitle: string;
  company?: string;
  candidateName: string;
  topPoints: string[];
}): string {
  return `Role: ${args.jobTitle}${args.company ? ` at ${args.company}` : ""}
Candidate: ${args.candidateName}
Strongest relevant points:\n- ${args.topPoints.join("\n- ")}

Write the email subject and body. The resume will be attached as a PDF, so mention it briefly.`;
}
