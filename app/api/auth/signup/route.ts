import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail, USE_DB } from "@/lib/store";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(req: NextRequest) {
  if (!USE_DB) {
    return NextResponse.json(
      { error: "Accounts require a database. Set DATABASE_URL to enable signup." },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash);
  const token = await signSession({ id: user.id, email: user.email });

  const res = NextResponse.json({ ok: true, email: user.email });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
