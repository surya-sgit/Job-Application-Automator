import { NextRequest, NextResponse } from "next/server";
import { readSecrets, writeSecrets, redactSecrets, Secrets, ProviderName } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const s = await readSecrets();
  return NextResponse.json(redactSecrets(s));
}

/**
 * Save settings. Only overwrites a key/password if a non-empty, non-masked
 * value is provided — so re-saving the form doesn't wipe existing secrets.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const current = await readSecrets();

  const keepIfMasked = (incoming: string | undefined, existing: string | undefined) => {
    if (incoming == null) return existing;
    if (incoming === "") return existing; // empty field → keep existing
    if (incoming.startsWith("•")) return existing; // masked value echoed back → keep
    return incoming;
  };

  const next: Secrets = {
    provider: (body.provider as ProviderName) || current.provider,
    model: body.model || current.model,
    cheapModel: body.cheapModel || current.cheapModel,
    ollamaBaseUrl: body.ollamaBaseUrl || current.ollamaBaseUrl,
    gmailUser: body.gmailUser ?? current.gmailUser,
    gmailAppPassword: keepIfMasked(body.gmailAppPassword, current.gmailAppPassword),
    keys: {
      anthropic: keepIfMasked(body.keys?.anthropic, current.keys.anthropic),
      openai: keepIfMasked(body.keys?.openai, current.keys.openai),
      google: keepIfMasked(body.keys?.google, current.keys.google),
      groq: keepIfMasked(body.keys?.groq, current.keys.groq),
    },
  };

  await writeSecrets(next);
  return NextResponse.json(redactSecrets(next));
}
