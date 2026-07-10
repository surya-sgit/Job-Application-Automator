import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth/login", "/api/auth/signup", "/api/auth/me"];

/**
 * Session gate for real user accounts. Only active when DATABASE_URL is set
 * (accounts require a database) — local file-fallback dev without a database
 * stays open, single-user, no login.
 */
export async function proxy(req: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // "/" is public (exact match only — the page itself decides landing vs app).
  if (pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;
  if (user) return NextResponse.next();

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
