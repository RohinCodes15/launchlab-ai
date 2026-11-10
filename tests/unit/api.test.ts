import { describe, expect, test, vi } from "vitest";
import { POST } from "@/app/api/coach/route";
import { DEMO_PROJECT_INPUT } from "@/lib/demo";
import { coachResponseSchema } from "@/lib/schema";

vi.stubEnv("AI_PROVIDER", "offline");

let clientCounter = 0;
/** Each call comes from a fresh client address unless one is given, so tests do not share a rate limit. */
const post = (body: string, client = `10.0.0.${++clientCounter}`) =>
  POST(
    new Request("http://localhost/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": client },
      body,
    }),
  );

const valid = { name: "StudySwap", summary: "", idea: DEMO_PROJECT_INPUT.idea };

describe("POST /api/coach", () => {
  test("returns a labelled offline review for a valid idea", async () => {
    const response = await post(JSON.stringify(valid));
    const body = coachResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.source).toBe("offline");
    expect(body.kind).toBe("review");
  });

  test("returns an answer when a question is included", async () => {
    const response = await post(JSON.stringify({ ...valid, question: "How do I find customers?" }));

    expect((await response.json()).kind).toBe("answer");
  });

  test("rejects malformed JSON", async () => {
    const response = await post("{not json");

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("JSON");
  });

  test.each([
    ["a missing name", { ...valid, name: "" }],
    ["a missing idea", { name: "X" }],
    ["a wrong field type", { ...valid, idea: { ...valid.idea, problem: 42 } }],
    ["an over-long field", { ...valid, idea: { ...valid.idea, problem: "x".repeat(2001) } }],
    ["unknown extra fields", { ...valid, admin: true }],
    ["a one-character question", { ...valid, question: "?" }],
  ])("rejects %s", async (_label, body) => {
    const response = await post(JSON.stringify(body));

    expect(response.status).toBe(400);
  });

  test("rejects oversized bodies", async () => {
    const response = await post(JSON.stringify({ ...valid, padding: "x".repeat(25_000) }));

    expect(response.status).toBe(413);
  });

  test("rate limits a single client and says when to retry", async () => {
    const client = "203.0.113.9";
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) statuses.push((await post(JSON.stringify(valid), client)).status);

    const blocked = await post(JSON.stringify(valid), client);

    expect(statuses.slice(0, 12).every((status) => status === 200)).toBe(true);
    expect(statuses[12]).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
