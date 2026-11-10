import { runCoach } from "@/lib/ai";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { coachRequestSchema } from "@/lib/schema";

export const maxDuration = 90;

const MAX_BODY_BYTES = 20_000;
const DEFAULT_REQUESTS_PER_MINUTE = 12;
const MAX_REQUESTS_PER_MINUTE = 1000;
const configured = Number(process.env.COACH_RATE_LIMIT_PER_MINUTE);
const requestsPerMinute =
  Number.isInteger(configured) && configured > 0 && configured <= MAX_REQUESTS_PER_MINUTE
    ? configured
    : DEFAULT_REQUESTS_PER_MINUTE;
const limiter = createRateLimiter(requestsPerMinute, 60_000);

const fail = (status: number, error: string, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers });

/**
 * Stateless: receives the idea text, returns feedback, stores nothing.
 * Projects themselves never leave the browser.
 */
export async function POST(request: Request): Promise<Response> {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = limiter(client);
  if (!limit.ok) {
    return fail(429, "Too many requests. Wait a moment and try again.", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return fail(413, "That request is too large.");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return fail(413, "That request is too large.");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "The request was not valid JSON.");
  }
  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(400, `Invalid request: ${issue.path.join(".") || "body"}: ${issue.message}`);
  }

  try {
    return Response.json(await runCoach(parsed.data));
  } catch (error) {
    console.error("Coach request failed:", error instanceof Error ? error.name : "unknown");
    return fail(500, "The coach could not produce feedback. Please try again.");
  }
}
