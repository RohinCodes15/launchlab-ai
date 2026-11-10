import type { Answer, CoachRequest, Review } from "../schema";

export type CoachQuestion = CoachRequest & { question: string };

/** One coach backend. Implementations must return data that already satisfies the Zod schemas. */
export interface CoachProvider {
  readonly source: "offline" | "ai";
  readonly model?: string;
  review(request: CoachRequest): Promise<Review>;
  answer(request: CoachQuestion): Promise<Answer>;
}
