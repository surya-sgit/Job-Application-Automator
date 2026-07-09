import { NextRequest, NextResponse } from "next/server";
import { TailoredResumeSchema } from "@/lib/resumeSchema";
import { renderResumePdf, resumeFilename } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Render tailored resume JSON to a downloadable one-page PDF. */
export async function POST(req: NextRequest) {
  const parsed = TailoredResumeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid resume payload." }, { status: 400 });
  }

  try {
    const pdf = await renderResumePdf(parsed.data);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resumeFilename(parsed.data)}"`,
      },
    });
  } catch (err) {
    console.error("[resume/pdf] error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
