import { NextRequest, NextResponse } from "next/server";
import { TailoredResumeSchema } from "@/lib/resumeSchema";
import { renderResumePdf, resumeFilename } from "@/lib/pdf";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const PdfPayloadSchema = z.object({
  resume: TailoredResumeSchema,
  metadata: z.object({
    layout: z.array(z.string()),
    hiddenSections: z.array(z.string()),
    template: z.string()
  }).optional()
});

export async function POST(req: NextRequest) {
  const parsed = PdfPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid resume payload." }, { status: 400 });
  }

  try {
    const pdf = await renderResumePdf(parsed.data.resume, parsed.data.metadata);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resumeFilename(parsed.data.resume)}"`,
      },
    });
  } catch (err) {
    console.error("[resume/pdf] error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
