import crypto from "crypto";

/**
 * AES-256-GCM encryption for the local secrets file. The key is derived from
 * APP_SECRET (env). If APP_SECRET isn't set we fall back to a constant so the
 * app still runs locally — but we warn, since that offers no real protection.
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  if (process.env.DATABASE_URL && !process.env.APP_SECRET) {
    throw new Error("FATAL: APP_SECRET environment variable is missing. It is required for secure encryption in production.");
  }
  const secret = process.env.APP_SECRET || "job-application-automator-default-dev-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // format: iv.tag.ciphertext (all base64)
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted payload");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}
