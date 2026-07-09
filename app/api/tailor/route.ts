import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getModel, MissingKeyError, describeConfig } from "@/lib/ai";
import { readProfile, readSecrets } from "@/lib/store";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import {
  JdAnalysisSchema,
  QuestionsSchema,
  TailoredResumeSchema,
  ProjectSchema,
} from "@/lib/resumeSchema";
import {
  QUESTIONS_SYSTEM,
  TAILOR_SYSTEM,
  tailorContext,
} from "@/lib/prompts";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Agent 3 — resume tailor. Two actions:
 *   action="questions" -> 3-6 clarifying questions (cheap-ish, small output)
 *   action="generate"  -> the tailored resume JSON, using the user's answers
 *
 * Only the JD analysis + matched project subset + trimmed profile reach the
 * model — never the whole profile store.
 */

const BodySchema = z.object({
  action: z.enum(["questions", "generate"]),
  analysis: JdAnalysisSchema,
  projects: z.array(ProjectSchema).default([]),
  answers: z.record(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
  const { action, analysis, projects, answers } = parsed.data;

  try {
    const userId = await requireUserId();
    const profile = await readProfile(userId);
    const secrets = await readSecrets(userId);
    const context = tailorContext(analysis, profile, projects, answers);

    if (action === "questions") {
      const { object, usage } = await generateObject({
        model: await getModel({ cheap: true, secrets }),
        schema: QuestionsSchema,
        system: QUESTIONS_SYSTEM,
        prompt: context,
      });
      console.log(`[tailor:questions] ${describeConfig(secrets)} tokens=`, usage);
      return NextResponse.json({ questions: object.questions, usage });
    }

    // action === "generate"
    const { object, usage } = await generateObject({
      model: await getModel({ secrets }),
      schema: TailoredResumeSchema,
      system: TAILOR_SYSTEM,
      prompt: context,
    });
    console.log(`[tailor:generate] ${describeConfig(secrets)} tokens=`, usage);
    return NextResponse.json({ resume: object, usage });
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
