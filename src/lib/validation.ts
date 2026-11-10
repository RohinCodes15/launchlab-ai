import { lines, shorten } from "./list";
import type { Hypothesis, Project, Validation } from "./schema";

/**
 * Validation Lab logic. Three things are kept apart everywhere:
 * the student's assumptions (source "user"), template suggestions (source "suggested"),
 * and evidence the student recorded. Nothing here invents interviews or results.
 */

export const INTERVIEW_QUESTION_BANK = [
  "Tell me about the last time this problem came up for you.",
  "What did you do about it? What was annoying about that?",
  "How often does this happen?",
  "What have you already tried, and what did it cost you in time or money?",
  "If you could wave a magic wand, what would change?",
  "Who else is involved when this happens?",
  "What would make you stop using what you use today?",
] as const;

const SUGGESTED_HYPOTHESES = [
  "The target audience has this problem often enough to look for a solution.",
  "The target audience is unhappy with what they use today.",
  "We can reach the target audience through a channel we already have access to.",
];

type Draft = Pick<Hypothesis, "statement" | "source">;

/** The student's own assumptions first, then generic templates, skipping any already listed. */
export function suggestHypotheses(project: Project): Draft[] {
  const existing = new Set(
    project.validation.hypotheses.map((h) => h.statement.trim().toLowerCase()),
  );
  const drafts: Draft[] = [
    ...lines(project.idea.assumptions).map((statement) => ({
      statement: statement.slice(0, 300),
      source: "user" as const,
    })),
    ...SUGGESTED_HYPOTHESES.map((statement) => ({ statement, source: "suggested" as const })),
  ];
  return drafts.filter((draft) => !existing.has(draft.statement.trim().toLowerCase()));
}

export function evidenceTally(
  validation: Validation,
  hypothesisId: string,
): { supports: number; contradicts: number } {
  const linked = validation.evidence.filter((entry) => entry.hypothesisId === hypothesisId);
  return {
    supports: linked.filter((entry) => entry.direction === "supports").length,
    contradicts: linked.filter((entry) => entry.direction === "contradicts").length,
  };
}

export type SurveySummary = {
  id: string;
  text: string;
  type: Validation["surveyQuestions"][number]["type"];
  count: number;
  average?: number;
  yesPercent?: number;
  answers?: string[];
};

/** Summaries are computed only from responses the student entered. */
export function summarizeSurvey(validation: Validation): SurveySummary[] {
  return validation.surveyQuestions.map((question) => {
    const answers = validation.surveyResponses
      .map((response) => response.answers[question.id]?.trim() ?? "")
      .filter(Boolean);
    const base = {
      id: question.id,
      text: question.text,
      type: question.type,
      count: answers.length,
    };
    if (answers.length === 0) return base;
    if (question.type === "scale") {
      const numbers = answers.map(Number).filter((n) => Number.isFinite(n));
      return numbers.length === 0
        ? { ...base, count: 0 }
        : {
            ...base,
            count: numbers.length,
            average: numbers.reduce((a, b) => a + b, 0) / numbers.length,
          };
    }
    if (question.type === "yesno") {
      const yes = answers.filter((answer) => answer === "yes").length;
      return { ...base, yesPercent: Math.round((yes / answers.length) * 100) };
    }
    return { ...base, answers };
  });
}

export function validationSummary(validation: Validation) {
  const { hypotheses } = validation;
  return {
    hypotheses: hypotheses.length,
    supported: hypotheses.filter((h) => h.status === "supported").length,
    refuted: hypotheses.filter((h) => h.status === "refuted").length,
    untested: hypotheses.filter((h) => h.status === "untested").length,
    evidence: validation.evidence.length,
    interviews: validation.interviews.length,
    responses: validation.surveyResponses.length,
  };
}

const TARGET_INTERVIEWS = 5;

/** Rule-based next steps derived from the recorded state. */
export function validationNextSteps(validation: Validation): string[] {
  const { hypotheses, interviews, experiments } = validation;
  if (hypotheses.length === 0) {
    return ["Add your riskiest assumptions as hypotheses, or import them from your idea."];
  }
  const quote = (h: Hypothesis) => `“${shorten(h.statement, 70)}”`;
  const tallies = hypotheses.map((h) => ({ h, ...evidenceTally(validation, h.id) }));
  const steps = [
    ...tallies
      .filter(
        ({ h, supports, contradicts }) => h.priority === "high" && supports + contradicts === 0,
      )
      .slice(0, 2)
      .map(({ h }) => `Test first: ${quote(h)} is high priority and has no evidence yet.`),
    ...tallies
      .filter(({ h, supports, contradicts }) => contradicts > supports && h.status !== "refuted")
      .map(({ h }) => `Evidence leans against ${quote(h)}. Change the idea, or mark it refuted.`),
    ...tallies
      .filter(({ h, supports }) => h.status === "supported" && supports === 0)
      .map(
        ({ h }) =>
          `${quote(h)} is marked supported with no supporting evidence. Record it or change the status.`,
      ),
    ...(interviews.length < TARGET_INTERVIEWS
      ? [
          `Record ${TARGET_INTERVIEWS - interviews.length} more customer interviews (${interviews.length} so far).`,
        ]
      : []),
    ...(validation.surveyQuestions.length > 0 && validation.surveyResponses.length === 0
      ? ["Your survey has questions but no responses. Collect some and enter them."]
      : []),
    ...experiments
      .filter((experiment) => experiment.status !== "planned" && !experiment.result.trim())
      .map((experiment) => `Write down the result of “${shorten(experiment.title, 60)}”.`),
  ];
  return steps.length > 0
    ? steps
    : ["Every flagged gap is covered. Update your idea, canvas and pitch with what you learned."];
}

/** Plain-text summary of recorded evidence, for the student to add to a pitch slide. */
export function evidenceSummaryText(validation: Validation): string {
  const summary = validationSummary(validation);
  const perHypothesis = validation.hypotheses
    .map((h) => ({ h, ...evidenceTally(validation, h.id) }))
    .filter(({ supports, contradicts }) => supports + contradicts > 0)
    .map(
      ({ h, supports, contradicts }) =>
        `• ${shorten(h.statement, 100)}: ${supports} for, ${contradicts} against`,
    );
  return [
    `What we have recorded so far: ${summary.interviews} interviews, ${summary.responses} survey responses, ${summary.evidence} pieces of evidence.`,
    ...perHypothesis,
  ].join("\n");
}
