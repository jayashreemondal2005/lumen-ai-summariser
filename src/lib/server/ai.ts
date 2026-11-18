import "server-only";
import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { z } from "zod";
import { serverEnv } from "./env";

/**
 * One provider/model the app may call. The chain is tried in order: Groq's
 * larger model first, its smaller model if that is rate-limited or fails,
 * then Gemini's free-tier Flash-Lite model only when GEMINI_API_KEY is set.
 */
interface ModelSlot {
  label: string;
  build: () => Parameters<typeof generateText>[0]["model"];
  providerOptions?: Record<string, Record<string, string | number | boolean | Record<string, number>>>;
}

export class AiUnavailableError extends Error {
  constructor(message = "The AI service is busy right now. Please try again in a minute.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI is not configured on this server.");
    this.name = "AiNotConfiguredError";
  }
}

function modelChain(): ModelSlot[] {
  const env = serverEnv();
  const slots: ModelSlot[] = [];
  if (env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: env.GROQ_API_KEY });
    const primary = env.GROQ_MODEL || "openai/gpt-oss-120b";
    const models = Array.from(new Set([primary, "openai/gpt-oss-20b"]));
    for (const id of models) {
      slots.push({
        label: `groq:${id}`,
        build: () => groq(id),
        providerOptions: {
          groq: {
            structuredOutputs: true,
            strictJsonSchema: false,
            ...(id.startsWith("openai/gpt-oss") ? { reasoningEffort: "low" } : {}),
          },
        },
      });
    }
  }
  if (env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    // Free-tier model only; no paid models are used.
    const id = env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    slots.push({
      label: `google:${id}`,
      build: () => google(id),
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    });
  }
  return slots;
}

export function aiConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.GROQ_API_KEY || env.GEMINI_API_KEY);
}

export interface StructuredCall<T> {
  schema: z.ZodType<T>;
  schemaName: string;
  instructions: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Per-attempt timeout. */
  timeoutMs?: number;
  /** Overall budget across fallbacks. */
  deadlineMs?: number;
  /** Extra validation that runs on the parsed output; throw to try the next model. */
  validate?: (value: T) => T;
}

/**
 * Runs a structured-output generation down the model chain. Every result is
 * schema-validated by the AI SDK and then by `validate` before it is accepted.
 */
export async function generateStructured<T>(call: StructuredCall<T>): Promise<{ value: T; model: string }> {
  const chain = modelChain();
  if (chain.length === 0) throw new AiNotConfiguredError();

  const started = Date.now();
  const deadline = call.deadlineMs ?? 28_000;
  let lastError: unknown;

  for (const slot of chain) {
    const remaining = deadline - (Date.now() - started);
    if (remaining < 2500) break;
    try {
      const result = await generateText({
        model: slot.build(),
        instructions: call.instructions,
        prompt: call.prompt,
        output: Output.object({ schema: call.schema, name: call.schemaName }),
        temperature: call.temperature ?? 0.2,
        maxOutputTokens: call.maxOutputTokens ?? 1800,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(Math.min(call.timeoutMs ?? 18_000, remaining)),
        providerOptions: slot.providerOptions as never,
      });
      const value = call.validate ? call.validate(result.output as T) : (result.output as T);
      return { value, model: slot.label };
    } catch (err) {
      lastError = err;
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[ai] ${slot.label} failed:`, (err as Error)?.message?.slice(0, 300));
      } else {
        console.warn(`[ai] ${slot.label} failed: ${(err as Error)?.name}`);
      }
    }
  }
  throw new AiUnavailableError(
    lastError instanceof Error && /timeout|abort/i.test(lastError.message)
      ? "The AI took too long to respond. Please try again."
      : undefined,
  );
}

/* ------------------------------------------------------------------ */
/* Prompt-injection hygiene                                            */
/* ------------------------------------------------------------------ */

/**
 * Untrusted text goes into prompts as escaped data inside tags. Escaping <, >
 * and & means page text can never close the <page> tag or forge new ones.
 */
export function escapeForPrompt(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Remove bidi overrides and zero-width characters often used to hide text.
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, "");
}
