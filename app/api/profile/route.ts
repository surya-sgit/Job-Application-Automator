import { NextRequest, NextResponse } from "next/server";
import { readProfile, writeProfile } from "@/lib/store";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { ProfileSchema } from "@/lib/resumeSchema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json(await readProfile(userId));
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = ProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const saved = await writeProfile(userId, parsed.data);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    throw err;
  }
}
