import { z } from "zod";

/**
 * The user's stored profile. Filled once on the Profile page and reused for
 * every JD. `projects` is a list — the matcher picks the relevant ones per JD.
 */

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  role: z.string().optional().default(""),
  stack: z.array(z.string()).default([]),
  description: z.string().default(""),
  bullets: z.array(z.string()).default([]),
  link: z.string().optional().default(""),
  contentHash: z.string().optional(),
  embedding: z.array(z.number()).optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional().default(""),
  start: z.string().optional().default(""),
  end: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string().optional().default(""),
  year: z.string().optional().default(""),
  details: z.string().optional().default(""),
});
export type Education = z.infer<typeof EducationSchema>;

export const ProfileSchema = z.object({
  name: z.string().default(""),
  title: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  links: z.array(z.string()).default([]),
  summary: z.string().default(""),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string())
  })).default([]).describe("Array of skill categories, e.g. [{ category: 'Languages', items: ['Python'] }]"),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  projects: z.array(ProjectSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  latexTemplate: z.string().default(""),
  defaultResumeLayout: z.array(z.string()).default(["summary", "experience", "projects", "skills", "education", "certifications", "achievements"]),
  hiddenSections: z.array(z.string()).default([]),
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Lenient shape for AI-extracted resume data (import/parse flow). No `id`
 * fields (the server assigns those) and everything defaults to empty, since
 * real-world resumes are messy and any field may be missing.
 */
export const ParsedProjectSchema = z.object({
  title: z.string().default(""),
  role: z.string().default(""),
  stack: z.array(z.string()).default([]),
  description: z.string().default(""),
  bullets: z.array(z.string()).default([]),
  link: z.string().default(""),
});

export const ParsedExperienceSchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  location: z.string().default(""),
  start: z.string().default(""),
  end: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const ParsedEducationSchema = z.object({
  school: z.string().default(""),
  degree: z.string().default(""),
  year: z.string().default(""),
  details: z.string().default(""),
});

export const ParsedProfileSchema = z.object({
  name: z.string().default(""),
  title: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  links: z.array(z.string()).default([]),
  summary: z.string().default(""),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string())
  })).default([]).describe("Array of skill categories, e.g. [{ category: 'Languages', items: ['Python'] }]"),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  projects: z.array(ParsedProjectSchema).default([]),
  experience: z.array(ParsedExperienceSchema).default([]),
  education: z.array(ParsedEducationSchema).default([]),
  latexTemplate: z.string().default(""),
});
export type ParsedProfile = z.infer<typeof ParsedProfileSchema>;

/**
 * The tailored resume produced by the AI for a specific JD. This is what the
 * PDF template renders. Kept tight so output tokens stay small.
 */
export const TailoredResumeSchema = z.object({
  name: z.string(),
  title: z.string(),
  contact: z.object({
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    links: z.array(z.string()).default([]),
  }),
  summary: z.string(),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string())
  })).default([]).describe("Array of skill categories, e.g. [{ category: 'Languages', items: ['Python'] }]"),
  suggestedSkills: z.array(z.string()).default([]).describe("Skills relevant to the JD that do NOT fit into any of the predefined user categories."),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        location: z.string().optional().default(""),
        start: z.string().optional().default(""),
        end: z.string().optional().default(""),
        bullets: z.array(z.string()).default([]),
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        title: z.string(),
        stack: z.array(z.string()).default([]),
        bullets: z.array(z.string()).default([]),
        link: z.string().optional().default(""),
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string().optional().default(""),
        year: z.string().optional().default(""),
        details: z.string().optional().default(""),
      })
    )
    .default([]),
});
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

/** Output of the JD analyzer agent (agent 1). */
export const JdAnalysisSchema = z.object({
  jobTitle: z.string(),
  companyName: z.string(),
  seniority: z.string(),
  hardSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  keywords: z.array(z.string()),
  responsibilities: z.array(z.string()),
  domain: z.string(),
  redFlags: z.array(z.string()),
  recruiterEmail: z.string().nullable().optional().catch(null),
});
export type JdAnalysis = z.infer<typeof JdAnalysisSchema>;

/** Clarifying questions returned by the tailor agent before it writes. */
export const QuestionsSchema = z.object({
  questions: z.array(z.string()).min(1).max(6),
});
export type Questions = z.infer<typeof QuestionsSchema>;

export const EmailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type EmailDraft = z.infer<typeof EmailDraftSchema>;

export const CritiqueSchema = z.object({
  critiques: z.array(z.object({
    section: z.string().describe("The section of the resume (e.g. Experience, Projects)"),
    issue: z.string().describe("A specific issue found (e.g. Passive voice, Missing metric, Repetition)"),
    suggestedFix: z.string().describe("The suggested rewritten text"),
  })),
});
export type CritiqueResult = z.infer<typeof CritiqueSchema>;
