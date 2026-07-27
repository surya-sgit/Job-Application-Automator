import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText, type LanguageModel } from "ai";
import { z } from "zod";
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

/**
 * Bypasses provider JSON validation bugs (like Groq + Qwen) by using generateText
 * and manually cleaning/parsing the JSON output.
 */
export async function safeGenerateObject<T>(opts: {
  model: LanguageModel;
  schema: z.ZodSchema<T>;
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<{ object: T; usage: any }> {
  const { text, usage } = await generateText({
    model: opts.model,
    temperature: opts.temperature ?? 0,
    system: opts.system + "\n\nCRITICAL INSTRUCTION: You MUST output strictly valid JSON matching the requested schema. Do NOT wrap in markdown code blocks like ```json. Do NOT include conversational text. Return ONLY the raw JSON object.",
    prompt: opts.prompt,
  });

  try {
    let cleanText = text.trim();
    
    // Strip <think> reasoning blocks from models like DeepSeek-R1 or Qwen
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Strip markdown code block wrappers
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    let parsed: any = null;
    let searchStartIndex = 0;

    while (parsed === null && searchStartIndex < cleanText.length) {
      const firstBrace = cleanText.indexOf('{', searchStartIndex);
      if (firstBrace === -1) break;

      let depth = 0;
      let lastBrace = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = firstBrace; i < cleanText.length; i++) {
        const char = cleanText[i];
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') depth--;
          
          if (depth === 0) {
            lastBrace = i;
            break;
          }
        }
      }
      
      if (lastBrace !== -1) {
        const candidate = cleanText.substring(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(candidate);
          break; // Successfully found and parsed a valid JSON object!
        } catch (e) {
          // Candidate was not valid JSON (e.g. a Typescript interface with unquoted types like "jobTitle": string)
          // Start searching for the next '{' after the current firstBrace
          searchStartIndex = firstBrace + 1;
        }
      } else {
        // No closing brace found for this block, stop searching
        break;
      }
    }

    if (!parsed) {
      throw new Error("No valid JSON object found in the response.");
    }

    const object = opts.schema.parse(parsed);
    return { object, usage };
  } catch (e: any) {
    console.error("[safeGenerateObject] parse error:", e, "\nRaw text:", text);
    throw new Error(`Failed to parse AI output as JSON: ${e.message}`);
  }
}
