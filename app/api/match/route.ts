import { NextRequest, NextResponse } from "next/server";
import { readProfile } from "@/lib/store";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { JdAnalysisSchema } from "@/lib/resumeSchema";
import { selectProjects } from "@/lib/match";

export const runtime = "nodejs";

/**
 * Agent 2 — project matcher. LOCAL, zero API tokens. Scores stored projects
 * against the JD analysis and returns the top-N with match info.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = JdAnalysisSchema.safeParse(body.analysis);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid analysis payload." }, { status: 400 });
    }
    const topN = typeof body.topN === "number" ? body.topN : 4;
    const jdEmbedding = Array.isArray(body.jdEmbedding) ? body.jdEmbedding : undefined;

    const profile = await readProfile(userId);
    const selected = selectProjects(profile.projects, parsed.data, topN, jdEmbedding);

    console.log(
      `[match] ${profile.projects.length} projects -> selected ${selected.length} (0 tokens)`
    );

    return NextResponse.json({
      selected: selected.map((s) => ({
        id: s.project.id,
        title: s.project.title,
        score: s.score,
        matched: s.matched,
      })),
      // full matched projects for the tailor step
      projects: selected.map((s) => s.project),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    throw err;
  }
}
