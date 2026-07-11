import { NextRequest, NextResponse } from "next/server";
import { readSecrets, writeSecrets, redactSecrets, Secrets, ProviderName } from "@/lib/store";
import { requireUserId, UnauthorizedError } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    const s = await readSecrets(userId);
    return NextResponse.json(redactSecrets(s));
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    throw err;
  }
}

/**
 * Save settings. Only overwrites a key/password if a non-empty, non-masked
 * value is provided — so re-saving the form doesn't wipe existing secrets.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const current = await readSecrets(userId);

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
      emailProvider: body.emailProvider || current.emailProvider,
      gmailUser: body.gmailUser ?? current.gmailUser,
      gmailAppPassword: keepIfMasked(body.gmailAppPassword, current.gmailAppPassword),
      outlookUser: body.outlookUser ?? current.outlookUser,
      outlookAppPassword: keepIfMasked(body.outlookAppPassword, current.outlookAppPassword),
      keys: {
        anthropic: keepIfMasked(body.keys?.anthropic, current.keys.anthropic),
        openai: keepIfMasked(body.keys?.openai, current.keys.openai),
        google: keepIfMasked(body.keys?.google, current.keys.google),
        groq: keepIfMasked(body.keys?.groq, current.keys.groq),
      },
    };

    await writeSecrets(userId, next);
    return NextResponse.json(redactSecrets(next));
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    throw err;
  }
}
