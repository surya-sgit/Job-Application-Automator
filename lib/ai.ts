import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";
import { Secrets } from "./store";

/**
 * Provider-agnostic model factory. Maps the chosen provider + model + key to a
 * Vercel AI SDK LanguageModel. Everything downstream (analyze/tailor/email)
 * calls getModel() and stays provider-agnostic.
 */

export class MissingKeyError extends Error {}

export async function getModel(opts: { cheap?: boolean; secrets: Secrets }): Promise<LanguageModel> {
  const s = opts.secrets;
  const modelId = opts.cheap ? s.cheapModel || s.model : s.model;

  switch (s.provider) {
    case "anthropic": {
      if (!s.keys.anthropic) throw new MissingKeyError("Missing Anthropic API key. Add it in Settings.");
      return createAnthropic({ apiKey: s.keys.anthropic })(modelId);
    }
    case "openai": {
      if (!s.keys.openai) throw new MissingKeyError("Missing OpenAI API key. Add it in Settings.");
      return createOpenAI({ apiKey: s.keys.openai })(modelId);
    }
    case "google": {
      if (!s.keys.google) throw new MissingKeyError("Missing Google API key. Add it in Settings.");
      return createGoogleGenerativeAI({ apiKey: s.keys.google })(modelId);
    }
    case "groq": {
      if (!s.keys.groq) throw new MissingKeyError("Missing Groq API key. Add it in Settings.");
      return createGroq({ apiKey: s.keys.groq })(modelId);
    }
    case "ollama": {
      // Ollama exposes an OpenAI-compatible endpoint at /v1
      const baseURL = (s.ollamaBaseUrl || "http://localhost:11434").replace(/\/$/, "") + "/v1";
      return createOpenAI({ baseURL, apiKey: "ollama" })(modelId);
    }
    default:
      throw new MissingKeyError(`Unknown provider: ${s.provider}`);
  }
}

/** Human-readable current config for logging (no secrets). */
export function describeConfig(s: Secrets) {
  return `provider=${s.provider} model=${s.model} cheapModel=${s.cheapModel}`;
}
