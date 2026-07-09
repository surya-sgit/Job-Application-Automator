import { cookies } from "next/headers";
import { SESSION_COOKIE, SessionUser, verifySession } from "./auth";
import { USE_DB } from "./store";

export class UnauthorizedError extends Error {}

/** Current logged-in user from the session cookie, or null if none/invalid. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * The effective userId for scoping profile/secrets data.
 *   - No DATABASE_URL (local file-fallback mode): always "local", no auth.
 *   - DATABASE_URL set: requires a valid session, throws UnauthorizedError otherwise.
 */
export async function requireUserId(): Promise<string> {
  if (!USE_DB) return "local";
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Not signed in.");
  return user.id;
}
