import { connection } from "next/server";
import { getAiStatus } from "@/lib/ai";

/** Liveness plus which coach is active. Reports the mode and model name only, never credentials. */
export async function GET(): Promise<Response> {
  await connection(); // read env at request time, not at build time
  return Response.json({ status: "ok", ai: getAiStatus() });
}
