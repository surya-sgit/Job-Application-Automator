import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { randomUUID } from "crypto";
import { getModel, MissingKeyError, describeConfig } from "@/lib/ai";
import { readSecrets } from "@/lib/store";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { ParsedProfileSchema, ProfileSchema } from "@/lib/resumeSchema";
import { RESUME_PARSE_SYSTEM, resumeParseUser } from "@/lib/prompts";
import { extractTextFromFile } from "@/lib/resumeParse";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Parse an uploaded resume (PDF/DOCX/TXT) or pasted resume text into a
 * structured profile, using the signed-in user's own configured AI provider.
 * Returns the parsed data for the client to review in the Profile form —
 * nothing is saved here.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    let text = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File is too large (max 5MB)." }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      text = await extractTextFromFile(buffer, file.name, file.type);
    } else {
      const body = await req.json();
      text = typeof body.text === "string" ? body.text : "";
    }

    if (!text || text.trim().length < 40) {
      return NextResponse.json(
        { error: "Couldn't find enough resume text to parse. Try pasting the text directly." },
        { status: 400 }
      );
    }

    const secrets = await readSecrets(userId);
    const { object, usage } = await generateObject({
      model: await getModel({ secrets }),
      schema: ParsedProfileSchema,
      system: RESUME_PARSE_SYSTEM,
      prompt: resumeParseUser(text),
    });
    console.log(`[profile/parse] ${describeConfig(secrets)} tokens=`, usage);

    const profile = ProfileSchema.parse({
      ...object,
      projects: object.projects.map((p) => ({ ...p, id: randomUUID() })),
      experience: object.experience.map((e) => ({ ...e, id: randomUUID() })),
      education: object.education.map((e) => ({ ...e, id: randomUUID() })),
    });

    return NextResponse.json({ profile, usage });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[profile/parse] error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
