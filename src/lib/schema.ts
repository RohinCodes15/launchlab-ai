import { z } from "zod";

export const TEXT_MAX = 2000;
export const NAME_MAX = 80;
export const SUMMARY_MAX = 200;
export const QUESTION_MAX = 500;

const text = z.string().max(TEXT_MAX).default("");

export const STATUSES = ["exploring", "validating", "building", "pitch-ready"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = {
  exploring: "Exploring",
  validating: "Validating",
  building: "Building",
  "pitch-ready": "Pitch-ready",
};

export const IDEA_FIELDS = [
  {
    key: "problem",
    label: "Problem statement",
    hint: "What is going wrong, for whom, and how often? Describe the pain, not your product.",
  },
  {
    key: "audience",
    label: "Target audience",
    hint: "The specific group you will talk to first. Narrow beats broad.",
  },
  {
    key: "solution",
    label: "Proposed solution",
    hint: "What you would build or offer, in plain words.",
  },
  {
    key: "differentiation",
    label: "Differentiation",
    hint: "What people use today instead, and why yours would be worth switching to.",
  },
  {
    key: "assumptions",
    label: "Assumptions",
    hint: "Things that must be true for this to work. One per line.",
  },
  {
    key: "successCriteria",
    label: "Success criteria",
    hint: "How you will know it is working. One measurable signal per line.",
  },
] as const;
export type IdeaKey = (typeof IDEA_FIELDS)[number]["key"];

export const ideaSchema = z.object({
  problem: text,
  audience: text,
  solution: text,
  differentiation: text,
  assumptions: text,
  successCriteria: text,
});
export type Idea = z.infer<typeof ideaSchema>;

export const CANVAS_BLOCKS = [
  {
    key: "customerSegments",
    area: "cs",
    label: "Customer Segments",
    hint: "Who are you creating value for?",
  },
  {
    key: "valuePropositions",
    area: "vp",
    label: "Value Propositions",
    hint: "Which problem do you solve, and what do customers gain?",
  },
  {
    key: "channels",
    area: "ch",
    label: "Channels",
    hint: "How do customers find, try and get your product?",
  },
  {
    key: "customerRelationships",
    area: "cr",
    label: "Customer Relationships",
    hint: "How do you win, keep and support customers?",
  },
  {
    key: "revenueStreams",
    area: "rs",
    label: "Revenue Streams",
    hint: "What would customers pay for, and how?",
  },
  {
    key: "keyResources",
    area: "kr",
    label: "Key Resources",
    hint: "What do you need to deliver the value?",
  },
  {
    key: "keyActivities",
    area: "ka",
    label: "Key Activities",
    hint: "What must you do well, every week?",
  },
  {
    key: "keyPartnerships",
    area: "kp",
    label: "Key Partnerships",
    hint: "Who helps you do what you cannot do alone?",
  },
  {
    key: "costStructure",
    area: "co",
    label: "Cost Structure",
    hint: "What will cost time or money to run this?",
  },
] as const;
export type CanvasKey = (typeof CANVAS_BLOCKS)[number]["key"];

export const canvasSchema = z.object({
  customerSegments: text,
  valuePropositions: text,
  channels: text,
  customerRelationships: text,
  revenueStreams: text,
  keyResources: text,
  keyActivities: text,
  keyPartnerships: text,
  costStructure: text,
});
export type Canvas = z.infer<typeof canvasSchema>;

export const SLIDE_TITLE_MAX = 120;
export const slideSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1).max(40),
  title: z.string().max(SLIDE_TITLE_MAX),
  body: z.string().max(TEXT_MAX),
});
export type Slide = z.infer<typeof slideSchema>;

// Coach output. Limits are generous: they bound what we store and render, not what a model may say.
const line = z.string().min(1).max(800);
const lines = z.array(line).min(1).max(10);

export const reviewSchema = z.object({
  summary: z.string().min(1).max(1500),
  problemClarity: z.object({ score: z.number().int().min(1).max(5), assessment: line }),
  customerSegment: z.object({ assessment: line, suggestions: lines }),
  competitorQuestions: lines,
  differentiation: lines,
  businessModels: lines,
  risks: z
    .array(z.object({ risk: line, severity: z.enum(["low", "medium", "high"]) }))
    .min(1)
    .max(10),
  experiments: z
    .array(z.object({ title: line, how: line, measure: line }))
    .min(1)
    .max(8),
  nextSteps: lines,
  uncertainty: line,
});
export type Review = z.infer<typeof reviewSchema>;

export const answerSchema = z.object({
  answer: z.string().min(1).max(3000),
  hypotheses: lines,
  nextSteps: lines,
});
export type Answer = z.infer<typeof answerSchema>;

const coachMeta = {
  source: z.enum(["offline", "ai"]),
  model: z.string().max(100).optional(),
  notice: z.string().max(300).optional(),
};

export const coachResponseSchema = z.discriminatedUnion("kind", [
  z.object({ ...coachMeta, kind: z.literal("review"), review: reviewSchema }),
  z.object({ ...coachMeta, kind: z.literal("answer"), answer: answerSchema }),
]);
export type CoachResponse = z.infer<typeof coachResponseSchema>;

const entryMeta = { ...coachMeta, id: z.string().min(1), createdAt: z.string() };
export const feedbackEntrySchema = z.discriminatedUnion("kind", [
  z.object({ ...entryMeta, kind: z.literal("review"), review: reviewSchema }),
  z.object({
    ...entryMeta,
    kind: z.literal("answer"),
    question: z.string().max(QUESTION_MAX),
    answer: answerSchema,
  }),
]);
export type FeedbackEntry = z.infer<typeof feedbackEntrySchema>;

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Give your project a name").max(NAME_MAX),
  summary: z.string().max(SUMMARY_MAX).default(""),
  status: z.enum(STATUSES).default("exploring"),
  archived: z.boolean().default(false),
  isDemo: z.boolean().default(false),
  idea: ideaSchema.prefault({}),
  canvas: canvasSchema.prefault({}),
  slides: z.array(slideSchema).max(30).default([]),
  feedback: z.array(feedbackEntrySchema).max(100).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const newProjectSchema = projectSchema.pick({ name: true, summary: true });
export type NewProjectInput = z.infer<typeof newProjectSchema>;

/** What the browser sends to the coach API: the idea only, never the whole project. */
export const coachRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(NAME_MAX),
  summary: z.string().max(SUMMARY_MAX).default(""),
  idea: ideaSchema,
  question: z.string().trim().min(3, "Ask a full question").max(QUESTION_MAX).optional(),
});
export type CoachRequest = z.infer<typeof coachRequestSchema>;
