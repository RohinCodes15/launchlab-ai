import { findUnverifiedClaims } from "./pitch";
import type { PracticeFeedback, PracticeSession } from "./schema";

type Check = { point: string; pattern: RegExp };

/** Question bank for pitch practice. `{name}` is replaced with the project name. */
export const PRACTICE_CATEGORIES: {
  key: string;
  label: string;
  questions: string[];
  checks: Check[];
}[] = [
  {
    key: "problem",
    label: "Problem",
    questions: [
      "What problem does {name} solve, and who has it?",
      "How do you know this problem is real?",
      "What happens to people today if nobody solves it?",
    ],
    checks: [
      {
        point: "who has the problem",
        pattern:
          /\b(students?|teachers?|parents?|people who|users?|customers?|teens?|owners?|families|schools?)\b/i,
      },
      {
        point: "what it costs them (time, money, stress)",
        pattern: /\b(time|hours?|money|cost|afford|stress|miss|waste|late|fail|grades?)\b/i,
      },
      {
        point: "how often it happens",
        pattern:
          /\b(every|each|daily|weekly|often|always|usually|per (day|week|month)|before (every|each))\b/i,
      },
    ],
  },
  {
    key: "customer",
    label: "Customer",
    questions: [
      "Who is your very first customer for {name}?",
      "Where will you find your first ten users?",
      "Who is not your customer?",
    ],
    checks: [
      {
        point: "a specific group, not everyone",
        pattern:
          /\b(at (our|my|one)|grade|sophomores?|juniors?|seniors?|freshmen|club|team|class|local|neighbou?rhood|ages? \d)/i,
      },
      {
        point: "where you will reach them",
        pattern:
          /\b(school|club|class|online|community|social|discord|instagram|tiktok|posters?|word of mouth|friends|teachers?)\b/i,
      },
    ],
  },
  {
    key: "solution",
    label: "Solution",
    questions: [
      "Explain what {name} does in two sentences.",
      "Why is this better than what people do today?",
      "What is the simplest version you could launch?",
    ],
    checks: [
      {
        point: "what the product actually does",
        pattern:
          /\b(app|site|website|service|tool|platform|matches?|helps?|lets|allows?|shows?|tracks?|connects?)\b/i,
      },
      {
        point: "the alternative people use today",
        pattern:
          /\b(today|currently|instead|right now|unlike|compared|alternative|existing|already use)\b/i,
      },
    ],
  },
  {
    key: "business-model",
    label: "Business model",
    questions: [
      "How will {name} make money?",
      "Who pays, and is that the same person who uses it?",
      "What does it cost you to serve one customer?",
    ],
    checks: [
      {
        point: "who pays",
        pattern: /\b(pays?|paid|buyers?|schools?|parents?|sponsors?|subscribers?|customers?)\b/i,
      },
      {
        point: "how you charge (price, subscription, free tier)",
        pattern:
          /\b(price|\$|fee|subscription|free|per (month|year|user|session)|one[- ]time|commission)\b/i,
      },
      { point: "your costs", pattern: /\b(costs?|hosting|expenses?|spend|budget|margin)\b/i },
    ],
  },
  {
    key: "validation",
    label: "Validation",
    questions: [
      "What evidence do you have that people want {name}?",
      "What is your riskiest assumption, and how will you test it?",
      "What would make you change direction?",
    ],
    checks: [
      {
        point: "something you actually did (interviews, a survey, a test)",
        pattern:
          /\b(interview(ed|s)?|survey(ed|s)?|talked to|asked|tested|pilot|sign[- ]?ups?|prototype|tried)\b/i,
      },
      {
        point: "what you still do not know",
        pattern:
          /\b(don'?t know|not sure|assum(e|ption|ing)|still need|haven'?t|yet|risk|unproven|hypothesis)\b/i,
      },
    ],
  },
  {
    key: "ask",
    label: "Team and ask",
    questions: [
      "Why are you the right person to build {name}?",
      "What do you need from the people in this room?",
      "What will you do in the next 30 days?",
    ],
    checks: [
      {
        point: "a concrete next step with a time frame",
        pattern: /\b(next|this (week|month)|by |within|days?|weeks?|months?)\b/i,
      },
      {
        point: "a specific request (feedback, introductions, testers)",
        pattern:
          /\b(feedback|introductions?|intro|testers?|mentor|advice|help|funding|space|access)\b/i,
      },
    ],
  },
];

const HEDGES =
  /\b(maybe|kind of|sort of|i think|i guess|basically|stuff|things|probably|hopefully)\b/gi;
const EVIDENCE =
  /\b(interview(ed|s)?|survey(ed|s)?|talked to|tested|pilot|sign[- ]?ups?|measured|counted)\b/i;

const MIN_WORDS = 25;
const TINY_WORDS = 10;
const MAX_WORDS = 200;
const LONG_SENTENCE_WORDS = 30;
const MAX_HEDGES = 3;

const clampRating = (value: number) => Math.min(5, Math.max(1, Math.round(value)));

/**
 * Deterministic feedback on a written practice answer. It checks length, wording
 * and whether expected points are mentioned. It cannot judge truth or persuasiveness,
 * and the UI always labels it as rule-based.
 */
export function offlinePracticeFeedback(category: string, response: string): PracticeFeedback {
  const text = response.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((s) => s.trim()).length);
  const hedges = (text.match(HEDGES) ?? []).length;
  const claims = findUnverifiedClaims(text);
  const checks = PRACTICE_CATEGORIES.find((entry) => entry.key === category)?.checks ?? [];
  const covered = checks.filter((check) => check.pattern.test(text));
  const missed = checks.filter((check) => !check.pattern.test(text));

  const clarityPenalties = [
    words < TINY_WORDS ? 2 : words < MIN_WORDS ? 1 : 0,
    words > MAX_WORDS ? 1 : 0,
    words / sentences > LONG_SENTENCE_WORDS ? 1 : 0,
    hedges >= MAX_HEDGES ? 1 : 0,
  ];

  return {
    summary:
      "Rule-based feedback. It checks length, wording, and whether expected points are mentioned. It cannot tell whether your answer is true or convincing, so also practise with a person.",
    clarity: clampRating(5 - clarityPenalties.reduce((a, b) => a + b, 0)),
    completeness: clampRating(checks.length === 0 ? 3 : 1 + (4 * covered.length) / checks.length),
    strengths: [
      ...covered.map((check) => `You covered ${check.point}.`),
      ...(EVIDENCE.test(text)
        ? ["You pointed to something you actually did, which builds trust."]
        : []),
      ...(words >= MIN_WORDS && words <= MAX_WORDS
        ? ["The length is right for a spoken answer."]
        : []),
    ],
    improvements: [
      ...missed.map((check) => `Mention ${check.point}.`),
      ...(words < MIN_WORDS
        ? [`At ${words} words this is too short to be convincing. Aim for 40 to 120.`]
        : []),
      ...(words > MAX_WORDS
        ? [`At ${words} words this would take over a minute to say. Cut it down.`]
        : []),
      ...(words / sentences > LONG_SENTENCE_WORDS
        ? ["Your sentences are long. Break them up so a listener can follow."]
        : []),
      ...(hedges >= MAX_HEDGES
        ? [
            "Words like “maybe”, “I think” and “kind of” weaken the answer. State what you know and what you don't.",
          ]
        : []),
      ...(claims.length > 0
        ? [
            `Be ready to back up: ${claims.map((c) => `“${c}”`).join(", ")}. Give a source or call it an assumption.`,
          ]
        : []),
    ],
  };
}

const RECENT_SESSIONS = 10;

export const fillQuestion = (question: string, name: string): string =>
  question.replaceAll("{name}", name);

/** Averages and the advice that keeps coming back across recent sessions (newest first). */
export function practiceStats(sessions: PracticeSession[]) {
  const recent = sessions.slice(0, RECENT_SESSIONS);
  const average = (pick: (s: PracticeSession) => number) =>
    recent.length
      ? Math.round((recent.reduce((sum, s) => sum + pick(s), 0) / recent.length) * 10) / 10
      : null;
  const counts = recent
    .flatMap((s) => s.feedback.improvements)
    .reduce((map, tip) => map.set(tip, (map.get(tip) ?? 0) + 1), new Map<string, number>());
  return {
    count: sessions.length,
    clarity: average((s) => s.feedback.clarity),
    completeness: average((s) => s.feedback.completeness),
    recurring: [...counts]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([tip]) => tip)
      .slice(0, 3),
  };
}
