import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getModel, MissingKeyError, describeConfig, safeGenerateObject } from "@/lib/ai";
import { readProfile, readSecrets, checkRateLimit } from "@/lib/store";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import {
  JdAnalysisSchema,
  QuestionsSchema,
  TailoredResumeSchema,
  ProjectSchema,
  CritiqueSchema,
} from "@/lib/resumeSchema";
import {
  QUESTIONS_SYSTEM,
  TAILOR_SYSTEM,
  TWEAK_SYSTEM,
  TAILOR_LATEX_SYSTEM,
  CRITIC_SYSTEM,
  EDITOR_SYSTEM,
  tailorContext,
  tweakContext,
  tailorLatexContext,
  criticContext,
  editorContext,
  questionsContext,
} from "@/lib/prompts";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Agent 3 — resume tailor. Three modes:
 *   action="questions" -> 3-6 clarifying questions
 *   action="generate"  -> full tailored resume from profile + projects
 *   action="generate" + mode="tweak" -> minimal tweak of an existing resume
 */

const BodySchema = z.object({
  action: z.enum(["questions", "generate"]),
  mode: z.enum(["json", "latex", "tweak"]).default("json"),
  analysis: JdAnalysisSchema,
  projects: z.array(ProjectSchema).default([]),
  answers: z.record(z.string()).optional(),
  baseResume: TailoredResumeSchema.optional(),
  deepPolish: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
  const { action, analysis, projects, answers } = parsed.data;

  try {
    const userId = await requireUserId();
    
    // Rate limit: 50 requests per hour
    const allowed = await checkRateLimit(userId, "tailor", 50, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const profile = await readProfile(userId);
    const secrets = await readSecrets(userId);

    if (action === "questions") {
      const context = questionsContext(analysis, profile, projects);
      const { object, usage } = await safeGenerateObject({
        model: await getModel({ cheap: true, secrets }),
        schema: QuestionsSchema,
        system: QUESTIONS_SYSTEM,
        prompt: context,
      });
      console.log(`[tailor:questions] ${describeConfig(secrets)} tokens=`, usage);
      return NextResponse.json({ questions: object.questions, usage });
    }

    // action === "generate"
    const existingCategories = Array.isArray(profile.skills)
      ? profile.skills.map((s: any) => s.category).filter(Boolean).join(", ")
      : "";

    if (parsed.data.mode === "tweak" && parsed.data.baseResume) {
      // Tweak mode: minor edits to an existing resume
      const context = tweakContext(analysis, parsed.data.baseResume, answers, existingCategories);
      const { object, usage } = await safeGenerateObject({
        model: await getModel({ secrets }),
        schema: TailoredResumeSchema,
        system: TWEAK_SYSTEM,
        prompt: context,
      });
      console.log(`[tailor:generate:tweak] ${describeConfig(secrets)} tokens=`, usage);
      return NextResponse.json({ resume: object, usage });
    } else if (parsed.data.mode === "latex" && profile.latexTemplate) {
      const context = tailorLatexContext(profile.latexTemplate, analysis, projects, answers);
      const { text, usage } = await generateText({
        model: await getModel({ secrets }),
        system: TAILOR_LATEX_SYSTEM,
        prompt: context,
        maxTokens: 1500,
      });
      console.log(`[tailor:generate:latex] ${describeConfig(secrets)} tokens=`, usage);
      return NextResponse.json({ latex: text, usage });
    } else {
      const context = tailorContext(analysis, profile, projects, answers);
      const { object: draftResume, usage: draftUsage } = await safeGenerateObject({
        model: await getModel({ secrets }),
        schema: TailoredResumeSchema,
        system: TAILOR_SYSTEM,
        prompt: context,
      });

      if (!parsed.data.deepPolish) {
        console.log(`[tailor:generate:json] ${describeConfig(secrets)} tokens=`, draftUsage);
        return NextResponse.json({ resume: draftResume, usage: draftUsage });
      }

      try {
        console.log(`[tailor:generate:draft] completed, running critic...`);
        const cContext = criticContext(draftResume);
        const { object: critiqueObj, usage: criticUsage } = await safeGenerateObject({
          model: await getModel({ cheap: true, secrets }), // use cheaper/faster model for critique if possible
          schema: CritiqueSchema,
          system: CRITIC_SYSTEM,
          prompt: cContext,
        });

        console.log(`[tailor:generate:critic] found ${critiqueObj.critiques.length} issues, running editor...`);
        const eContext = editorContext(draftResume, critiqueObj.critiques, existingCategories);
        const { object: finalResume, usage: editorUsage } = await safeGenerateObject({
          model: await getModel({ secrets }),
          schema: TailoredResumeSchema,
          system: EDITOR_SYSTEM,
          prompt: eContext,
        });

        const totalUsage = {
          promptTokens: draftUsage.promptTokens + criticUsage.promptTokens + editorUsage.promptTokens,
          completionTokens: draftUsage.completionTokens + criticUsage.completionTokens + editorUsage.completionTokens,
          totalTokens: draftUsage.totalTokens + criticUsage.totalTokens + editorUsage.totalTokens,
        };

        console.log(`[tailor:generate:deepPolish] ${describeConfig(secrets)} tokens=`, totalUsage);
        return NextResponse.json({ resume: finalResume, usage: totalUsage });
      } catch (polishError) {
        console.error("[tailor:generate:deepPolish] Deep polish failed, falling back to draft:", polishError);
        return NextResponse.json({ 
          resume: draftResume, 
          usage: draftUsage,
          fallback: true,
          fallbackReason: "Deep Polish timed out or encountered an error. Falling back to the standard tailored draft."
        });
      }
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[tailor] error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
