import "server-only";
import { optionalEnv, requireEnv } from "@/lib/env";

const BASE_URL = "https://api.prod.adaptionlabs.ai/api/v1";
const TIMEOUT_MS = 45_000;
const DEFAULT_CHAT_MODEL = "qwen3.5-397b";
const DEFAULT_FAST_MODEL = "deepseek-v4-flash";

export interface AdaptionMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RespondOptions {
  /** System-level instructions for the model. */
  instructions: string;
  input: string | AdaptionMessage[];
  /** "fast" for extraction, "chat" for conversation and writing. */
  tier?: "fast" | "chat";
  /** Ground the answer on our adapted care-guidance dataset when a stack exists. */
  grounded?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
}

export class AdaptionError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AdaptionError";
  }
}

interface ResponsesPayload {
  status?: string;
  output_text?: string;
  error?: { message?: string } | null;
}

/** True when an Adaption API key is configured. */
export function adaptionConfigured(): boolean {
  return Boolean(optionalEnv("ADAPTION_API_KEY"));
}

/** Slug of the Inference Stack grounded on our adapted dataset, if set up. */
export function stackSlug(): string | undefined {
  return optionalEnv("ADAPTION_STACK_SLUG");
}

function modelFor(tier: "fast" | "chat"): string {
  return tier === "fast"
    ? (optionalEnv("ADAPTION_FAST_MODEL") ?? DEFAULT_FAST_MODEL)
    : (optionalEnv("ADAPTION_CHAT_MODEL") ?? DEFAULT_CHAT_MODEL);
}

async function callResponses(body: Record<string, unknown>): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireEnv("ADAPTION_API_KEY")}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new AdaptionError(
      error instanceof Error ? `Adaption request failed: ${error.message}` : "Adaption request failed",
    );
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new AdaptionError(`Adaption returned ${response.status}: ${detail}`, response.status);
  }

  const payload = (await response.json()) as ResponsesPayload;
  const text = payload.output_text?.trim();
  if (!text) {
    throw new AdaptionError(payload.error?.message ?? "Adaption returned an empty response");
  }
  return text;
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof AdaptionError)) return false;
  return error.status === undefined || error.status === 429 || error.status >= 500;
}

/**
 * Generates text with Adaption's Responses API.
 * Grounded calls go to our Inference Stack (model + adapted dataset via
 * file_search); if the stack is missing or fails we fall back to the hosted
 * model so the feature keeps working.
 */
export async function respond(options: RespondOptions): Promise<string> {
  const base = {
    instructions: options.instructions,
    input: options.input,
    max_output_tokens: options.maxOutputTokens ?? 900,
    temperature: options.temperature ?? 0.3,
  };
  const hosted = { ...base, model: modelFor(options.tier ?? "chat") };
  const slug = options.grounded ? stackSlug() : undefined;

  if (slug) {
    try {
      return await callResponses({
        ...base,
        model: `stack:${slug}`,
        tools: [{ type: "file_search" }],
      });
    } catch (error) {
      console.warn("Adaption stack call failed; using hosted model.", error);
    }
  }

  try {
    return await callResponses(hosted);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    return callResponses(hosted);
  }
}
