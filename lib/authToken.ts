/**
 * Edge-runtime-safe session token derivation (Web Crypto only — no Node
 * `crypto`/`Buffer`), shared by middleware.ts and the login API route so both
 * compute the exact same cookie value from APP_PASSWORD.
 */
export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder().encode(`${password}:job-application-automator-session`);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const SESSION_COOKIE = "aa_session";
