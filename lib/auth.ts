import bcrypt from "bcryptjs";

// JWT/session helpers live in lib/jwt.ts (jose-only, safe for the middleware
// bundle); re-exported here so existing imports keep working.
export * from "./jwt";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
