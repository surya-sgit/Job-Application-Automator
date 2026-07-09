import { NextRequest, NextResponse } from "next/server";
import { sessionToken, SESSION_COOKIE } from "@/lib/authToken";

/**
 * Password gate for public deployments. Only active when APP_PASSWORD is set
 * (i.e. on a hosted deployment) — local dev without that env var stays open.
 */
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await sessionToken(password);
  if (cookie === expected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
