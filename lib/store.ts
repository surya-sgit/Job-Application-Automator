import fs from "fs";
import path from "path";
import { encrypt, decrypt } from "./crypto";
import { Profile, ProfileSchema } from "./resumeSchema";

/**
 * Storage layer with two backends:
 *   - Postgres (Neon), a single key/value table, when DATABASE_URL is set —
 *     this is what makes profile/secrets persist on a serverless host.
 *   - Local JSON files under /data (gitignored) otherwise, for local dev.
 *
 * profile.json is plaintext (it's yours); secrets are always AES-encrypted
 * before being written to either backend.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
const SECRETS_FILE = path.join(DATA_DIR, "secrets.json");

const USE_DB = !!process.env.DATABASE_URL;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

type Sql = import("@neondatabase/serverless").NeonQueryFunction<false, false>;
let sqlSingleton: Sql | null = null;
let schemaReady: Promise<void> | null = null;

async function db(): Promise<Sql> {
  if (!sqlSingleton) {
    const { neon } = await import("@neondatabase/serverless");
    sqlSingleton = neon(process.env.DATABASE_URL!);
  }
  if (!schemaReady) {
    schemaReady = sqlSingleton`
      CREATE TABLE IF NOT EXISTS app_kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.then(() => undefined);
  }
  await schemaReady;
  return sqlSingleton;
}

async function kvGet(key: string): Promise<string | null> {
  const sql = await db();
  const rows = (await sql`SELECT value FROM app_kv WHERE key = ${key}`) as Array<{ value: string }>;
  return rows[0]?.value ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  const sql = await db();
  await sql`
    INSERT INTO app_kv (key, value, updated_at) VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

// ---------- Profile ----------

export async function readProfile(): Promise<Profile> {
  try {
    if (USE_DB) {
      const raw = await kvGet("profile");
      if (!raw) return ProfileSchema.parse({});
      return ProfileSchema.parse(JSON.parse(raw));
    }
    if (!fs.existsSync(PROFILE_FILE)) return ProfileSchema.parse({});
    const raw = JSON.parse(fs.readFileSync(PROFILE_FILE, "utf8"));
    return ProfileSchema.parse(raw);
  } catch {
    return ProfileSchema.parse({});
  }
}

export async function writeProfile(profile: Profile): Promise<Profile> {
  const parsed = ProfileSchema.parse(profile);
  if (USE_DB) {
    await kvSet("profile", JSON.stringify(parsed));
    return parsed;
  }
  ensureDir();
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(parsed, null, 2), "utf8");
  return parsed;
}

// ---------- Secrets ----------

export type ProviderName = "anthropic" | "openai" | "google" | "groq" | "ollama";

export interface Secrets {
  provider: ProviderName;
  model: string;
  cheapModel: string; // used by the JD analyzer agent (agent 1)
  keys: {
    anthropic?: string;
    openai?: string;
    google?: string;
    groq?: string;
  };
  ollamaBaseUrl?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
}

const DEFAULT_SECRETS: Secrets = {
  provider: "anthropic",
  model: "claude-opus-4-8",
  cheapModel: "claude-haiku-4-5-20251001",
  keys: {},
  ollamaBaseUrl: "http://localhost:11434",
};

async function readEncryptedSecrets(): Promise<string | null> {
  if (USE_DB) return kvGet("secrets");
  if (!fs.existsSync(SECRETS_FILE)) return null;
  return fs.readFileSync(SECRETS_FILE, "utf8");
}

async function writeEncryptedSecrets(payload: string): Promise<void> {
  if (USE_DB) {
    await kvSet("secrets", payload);
    return;
  }
  ensureDir();
  fs.writeFileSync(SECRETS_FILE, payload, "utf8");
}

/** Read secrets, layering env-var fallbacks under anything saved in the UI. */
export async function readSecrets(): Promise<Secrets> {
  let saved: Partial<Secrets> = {};
  try {
    const enc = await readEncryptedSecrets();
    if (enc) saved = JSON.parse(decrypt(enc)) as Partial<Secrets>;
  } catch {
    saved = {};
  }

  const merged: Secrets = {
    ...DEFAULT_SECRETS,
    ...saved,
    keys: {
      anthropic: saved.keys?.anthropic || process.env.ANTHROPIC_API_KEY || "",
      openai: saved.keys?.openai || process.env.OPENAI_API_KEY || "",
      google: saved.keys?.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
      groq: saved.keys?.groq || process.env.GROQ_API_KEY || "",
    },
    ollamaBaseUrl: saved.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    gmailUser: saved.gmailUser || process.env.GMAIL_USER || "",
    gmailAppPassword: saved.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || "",
  };
  return merged;
}

export async function writeSecrets(secrets: Secrets): Promise<Secrets> {
  await writeEncryptedSecrets(encrypt(JSON.stringify(secrets)));
  return secrets;
}

/** Redacted view for sending to the browser — never expose raw keys. */
export function redactSecrets(s: Secrets) {
  const mask = (v?: string) => (v ? "•".repeat(8) + v.slice(-4) : "");
  return {
    provider: s.provider,
    model: s.model,
    cheapModel: s.cheapModel,
    ollamaBaseUrl: s.ollamaBaseUrl,
    gmailUser: s.gmailUser,
    keys: {
      anthropic: mask(s.keys.anthropic),
      openai: mask(s.keys.openai),
      google: mask(s.keys.google),
      groq: mask(s.keys.groq),
    },
    gmailAppPasswordSet: !!s.gmailAppPassword,
  };
}
