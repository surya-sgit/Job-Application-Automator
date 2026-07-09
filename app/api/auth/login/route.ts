import { NextRequest, NextResponse } from "next/server";
import { sessionToken, SESSION_COOKIE } from "@/lib/authToken";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "No app password is configured on the server." }, { status: 500 });
  }

  const { password } = await req.json();
  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await sessionToken(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
