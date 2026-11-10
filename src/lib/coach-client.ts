import { coachResponseSchema, type CoachRequest, type CoachResponse } from "./schema";

/** Browser-side call to the coach route, with errors turned into messages safe to show. */
export async function postCoach(request: CoachRequest): Promise<CoachResponse> {
  let response: Response;
  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("Could not reach the coach. Check your connection and try again.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as { error?: unknown } | null)?.error;
    throw new Error(
      typeof message === "string" ? message : "The coach could not respond. Try again.",
    );
  }
  const parsed = coachResponseSchema.safeParse(body);
  if (!parsed.success)
    throw new Error("The coach sent a response this app could not read. Try again.");
  return parsed.data;
}

export const sourceLabel = (entry: Pick<CoachResponse, "source" | "model">): string =>
  entry.source === "ai"
    ? `AI coach · ${entry.model ?? "model"}`
    : "Offline coach · rule-based, not an AI model";
