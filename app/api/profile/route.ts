import { NextRequest, NextResponse } from "next/server";
import { readProfile, writeProfile } from "@/lib/store";
import { ProfileSchema } from "@/lib/resumeSchema";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await readProfile());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const saved = await writeProfile(parsed.data);
  return NextResponse.json(saved);
}
