import { SignJWT, jwtVerify } from "jose";

/**
 * JWT session helpers, kept jose-only (no bcryptjs) so proxy.ts can import
 * them without dragging password-hashing code into the middleware bundle.
 */

export const SESSION_COOKIE = "aa_session";

export interface SessionUser {
  id: string;
  email: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.APP_SECRET || "job-application-automator-default-dev-secret";
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
