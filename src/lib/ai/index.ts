import { z } from "zod";
import type { CoachRequest, CoachResponse } from "../schema";
import { createAnthropicProvider } from "./anthropic";
import { offlineProvider } from "./offline";
import type { CoachProvider } from "./provider";

const envSchema = z.object({
  AI_PROVIDER: z.enum(["offline", "anthropic"]).default("offline"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default("claude-opus-5-5"),
});

type Env = Record<string, string | undefined>;

export type AiStatus = { mode: "offline" | "ai"; model?: string; reason?: string };

/** Safe to send to the browser: never includes the key itself. */
export function getAiStatus(env: Env = process.env): AiStatus {
  const parsed = envSchema.safeParse({
    AI_PROVIDER: env.AI_PROVIDER || undefined,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || undefined,
    AI_MODEL: env.AI_MODEL || undefined,
  });
  if (!parsed.success) return { mode: "offline", reason: "AI_PROVIDER is not a supported value." };
  if (parsed.data.AI_PROVIDER === "offline") return { mode: "offline" };
  if (!parsed.data.ANTHROPIC_API_KEY) {
    return {
      mode: "offline",
      reason: "AI_PROVIDER is anthropic but ANTHROPIC_API_KEY is not set.",
    };
  }
  return { mode: "ai", model: parsed.data.AI_MODEL };
}

export function getProvider(env: Env = process.env): CoachProvider {
  const status = getAiStatus(env);
  return status.mode === "ai" && status.model
    ? createAnthropicProvider({ model: status.model, apiKey: env.ANTHROPIC_API_KEY })
    : offlineProvider;
}

async function run(provider: CoachProvider, request: CoachRequest) {
  if (request.practice !== undefined) {
    const practice = await provider.practice({ ...request, practice: request.practice });
    return { kind: "practice" as const, practice };
  }
  if (request.question !== undefined) {
    const answer = await provider.answer({ ...request, question: request.question });
    return { kind: "answer" as const, answer };
  }
  return { kind: "review" as const, review: await provider.review(request) };
}

/**
 * Run the configured coach. If the AI provider fails for any reason, fall back to
 * the offline coach and say so, so the student is never left with nothing and
 * rule-based output is never presented as model output.
 */
export async function runCoach(
  request: CoachRequest,
  provider: CoachProvider = getProvider(),
): Promise<CoachResponse> {
  try {
    return { source: provider.source, model: provider.model, ...(await run(provider, request)) };
  } catch (error) {
    if (provider.source === "offline") throw error;
    // Log the failure class only: provider errors can echo request content.
    console.error(
      "AI coach failed, using offline coach:",
      error instanceof Error ? error.name : "unknown",
    );
    return {
      source: "offline",
      notice:
        "The AI coach was unavailable, so this feedback comes from the offline rule-based coach.",
      ...(await run(offlineProvider, request)),
    };
  }
}
