import { TEXT_MAX, type Project, type Slide } from "./schema";

export const SLIDE_KINDS = [
  { kind: "problem", label: "Problem" },
  { kind: "solution", label: "Solution" },
  { kind: "market", label: "Target market" },
  { kind: "product", label: "Product" },
  { kind: "business-model", label: "Business model" },
  { kind: "differentiation", label: "Differentiation" },
  { kind: "validation", label: "Validation plan" },
  { kind: "roadmap", label: "Roadmap" },
  { kind: "closing", label: "Closing" },
] as const;

export const slideLabel = (kind: string): string =>
  SLIDE_KINDS.find((entry) => entry.kind === kind)?.label ?? "Slide";

/** Marks a slide section the student has not written source material for yet. */
export const MISSING = "[Not written yet";
const missing = (where: string) => `${MISSING}: add ${where}]`;

const join = (...parts: string[]) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, TEXT_MAX);

const bullets = (text: string) =>
  text
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => `• ${entry}`)
    .join("\n");

/**
 * Build a nine-slide outline from the saved idea and canvas. Text is carried over
 * from what the student wrote; nothing is invented.
 */
export function generateSlides(project: Project, newId: () => string): Slide[] {
  const { idea, canvas, name, summary } = project;
  const bodies: Record<(typeof SLIDE_KINDS)[number]["kind"], [title: string, body: string]> = {
    problem: ["The problem", idea.problem.trim() || missing("a problem statement in Idea Studio")],
    solution: [
      `Meet ${name}`,
      join(summary, idea.solution) || missing("your proposed solution in Idea Studio"),
    ],
    market: [
      "Who it is for",
      join(idea.audience, canvas.customerSegments) || missing("a target audience in Idea Studio"),
    ],
    product: [
      "How it works",
      join(
        canvas.valuePropositions,
        canvas.channels && `How people find it:\n${canvas.channels}`,
      ) || missing("Value Propositions and Channels in the canvas"),
    ],
    "business-model": [
      "Business model",
      join(
        canvas.revenueStreams && `Revenue:\n${canvas.revenueStreams}`,
        canvas.costStructure && `Costs:\n${canvas.costStructure}`,
      ) || missing("Revenue Streams and Cost Structure in the canvas"),
    ],
    differentiation: [
      "Why this is different",
      idea.differentiation.trim() || missing("your differentiation in Idea Studio"),
    ],
    validation: [
      "What we still need to prove",
      idea.assumptions.trim()
        ? join("Our riskiest assumptions, and what we will test first:", bullets(idea.assumptions))
        : missing("your assumptions in Idea Studio"),
    ],
    roadmap: [
      "Roadmap",
      idea.successCriteria.trim()
        ? join(
            "Next: talk to target users and run a small test.",
            "We will know it is working when:",
            bullets(idea.successCriteria),
          )
        : missing("success criteria in Idea Studio"),
    ],
    closing: [
      name,
      join(
        summary,
        "What we are asking for: feedback, introductions to target users, and a first group of testers.",
      ),
    ],
  };
  return SLIDE_KINDS.map(({ kind }) => {
    const [title, body] = bodies[kind];
    return { id: newId(), kind, title, body };
  });
}

const CLAIM_PATTERNS: RegExp[] = [
  /[$€£]\s?\d[\d,.]*\s?(?:k|m|bn|million|billion|thousand)?/gi,
  /\d[\d,.]*\s?(?:%|percent\b|x\b|million\b|billion\b|thousand\b)/gi,
  /\b(?:guaranteed?|proven|everyone|everybody|nobody|no (?:real )?competit(?:ion|ors)|the (?:best|only|first)|always|never|#1|number one|revolutionary|world[- ]class)\b/gi,
];

/**
 * Phrases a judge would ask "how do you know?" about: statistics, money figures
 * and absolute claims. A heuristic that prompts the student to cite or soften;
 * it cannot tell whether a claim is actually true.
 */
export function findUnverifiedClaims(text: string): string[] {
  const found = CLAIM_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []).map((match) =>
    match.trim(),
  );
  return [...new Set(found)];
}

export function moveSlide(slides: Slide[], index: number, direction: -1 | 1): Slide[] {
  const target = index + direction;
  if (index < 0 || index >= slides.length || target < 0 || target >= slides.length) return slides;
  const next = [...slides];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
