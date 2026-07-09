import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { readSecrets } from "@/lib/store";
import { TailoredResumeSchema } from "@/lib/resumeSchema";
import { renderResumePdf, resumeFilename } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  to: z.string().email("Please enter a valid recipient email."),
  subject: z.string().min(1),
  body: z.string().min(1),
  resume: TailoredResumeSchema,
  cc: z.string().email().optional(),
});

/**
 * One-click send via Gmail (Nodemailer + App Password). Generates the PDF fresh
 * from the tailored resume JSON and attaches it, so the sent resume always
 * matches the preview.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 }
    );
  }
  const { to, subject, body, resume, cc } = parsed.data;

  const secrets = await readSecrets();
  if (!secrets.gmailUser || !secrets.gmailAppPassword) {
    return NextResponse.json(
      { error: "Gmail is not configured. Add your Gmail address + App Password in Settings." },
      { status: 400 }
    );
  }

  try {
    const pdf = await renderResumePdf(resume);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: secrets.gmailUser, pass: secrets.gmailAppPassword },
    });

    const info = await transporter.sendMail({
      from: secrets.gmailUser,
      to,
      cc,
      subject,
      text: body,
      attachments: [
        { filename: resumeFilename(resume), content: pdf, contentType: "application/pdf" },
      ],
    });

    console.log(`[email/send] sent to ${to} id=${info.messageId}`);
    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error("[email/send] error", err);
    const msg = (err as Error).message || "Failed to send email.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
