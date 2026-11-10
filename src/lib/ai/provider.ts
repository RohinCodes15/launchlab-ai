import type { Answer, CoachRequest, PracticeFeedback, Review } from "../schema";

export type CoachQuestion = CoachRequest & { question: string };
export type CoachPractice = CoachRequest & { practice: NonNullable<CoachRequest["practice"]> };

/** One coach backend. Implementations must return data that already satisfies the Zod schemas. */
export interface CoachProvider {
  readonly source: "offline" | "ai";
  readonly model?: string;
  review(request: CoachRequest): Promise<Review>;
  answer(request: CoachQuestion): Promise<Answer>;
  practice(request: CoachPractice): Promise<PracticeFeedback>;
}
