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

// ---- Project tools (added after v1). Every field has a default so projects saved by
// earlier versions still parse: that default is the migration. ----

const itemId = z.string().min(1).max(64);
const ref = z.string().max(64).default(""); // optional link to another item's id; "" = none
const rating = z.number().int().min(1).max(5);
export const SOURCES = ["user", "suggested"] as const;
const source = z.enum(SOURCES).default("user");

export const PRIORITIES = ["high", "medium", "low"] as const;
export const HYPOTHESIS_STATUSES = ["untested", "testing", "supported", "refuted"] as const;
export const EVIDENCE_KINDS = ["interview", "survey", "experiment", "other"] as const;
export const EVIDENCE_DIRECTIONS = ["supports", "contradicts", "neutral"] as const;
export const SURVEY_TYPES = ["scale", "yesno", "text"] as const;
export const EXPERIMENT_STATUSES = ["planned", "running", "done"] as const;

export const validationSchema = z.object({
  hypotheses: z
    .array(
      z.object({
        id: itemId,
        statement: z.string().max(300),
        source,
        priority: z.enum(PRIORITIES).default("medium"),
        confidence: rating.default(3),
        status: z.enum(HYPOTHESIS_STATUSES).default("untested"),
      }),
    )
    .max(30)
    .default([]),
  interviewQuestions: z
    .array(z.object({ id: itemId, text: z.string().max(300) }))
    .max(30)
    .default([]),
  interviews: z
    .array(
      z.object({
        id: itemId,
        who: z.string().max(120),
        date: z.string().max(10),
        notes: z.string().max(TEXT_MAX),
      }),
    )
    .max(50)
    .default([]),
  surveyQuestions: z
    .array(z.object({ id: itemId, text: z.string().max(300), type: z.enum(SURVEY_TYPES) }))
    .max(12)
    .default([]),
  surveyResponses: z
    .array(z.object({ id: itemId, answers: z.record(z.string().max(64), z.string().max(500)) }))
    .max(200)
    .default([]),
  evidence: z
    .array(
      z.object({
        id: itemId,
        text: z.string().max(500),
        kind: z.enum(EVIDENCE_KINDS),
        direction: z.enum(EVIDENCE_DIRECTIONS),
        hypothesisId: ref,
      }),
    )
    .max(100)
    .default([]),
  experiments: z
    .array(
      z.object({
        id: itemId,
        title: z.string().max(120),
        hypothesisId: ref,
        method: z.string().max(500).default(""),
        metric: z.string().max(300).default(""),
        status: z.enum(EXPERIMENT_STATUSES).default("planned"),
        result: z.string().max(500).default(""),
      }),
    )
    .max(30)
    .default([]),
});
export type Validation = z.infer<typeof validationSchema>;
export type Hypothesis = Validation["hypotheses"][number];

const money = z.number().min(0, "Must be 0 or more").max(10_000_000, "Too large");
export const scenarioSchema = z.object({
  id: itemId,
  name: z.string().max(40),
  price: money,
  unitsPerMonth: z.number().min(0, "Must be 0 or more").max(1_000_000, "Too large"),
  growthPct: z.number().min(-50, "At least -50").max(100, "At most 100"),
  variableCost: money,
  fixedCosts: money,
  startingCash: money,
});
export type Scenario = z.infer<typeof scenarioSchema>;
export const MAX_SCENARIOS = 4;
export const financeSchema = z.object({
  scenarios: z.array(scenarioSchema).max(MAX_SCENARIOS).default([]),
});

export const practiceFeedbackSchema = z.object({
  summary: line,
  clarity: rating,
  completeness: rating,
  strengths: z.array(line).max(10),
  improvements: z.array(line).max(10),
});
export type PracticeFeedback = z.infer<typeof practiceFeedbackSchema>;

const practiceInput = {
  category: z.string().min(1).max(40),
  question: z.string().min(1).max(300),
  response: z.string().trim().min(1, "Write an answer first").max(TEXT_MAX),
};

export const PERSONA_FIELDS = [
  {
    key: "who",
    label: "Who they are",
    hint: "Age range, role, situation. Only what matters for this product.",
  },
  { key: "goals", label: "Goals" },
  { key: "pains", label: "Pain points" },
  { key: "needs", label: "Needs" },
  { key: "behaviors", label: "Behaviors" },
  { key: "motivations", label: "Buying motivations" },
] as const;
const personaText = z.string().max(600).default("");
export const personaSchema = z.object({
  id: itemId,
  name: z.string().max(60),
  source,
  basis: z.enum(["assumption", "evidence"]).default("assumption"),
  who: personaText,
  goals: personaText,
  pains: personaText,
  needs: personaText,
  behaviors: personaText,
  motivations: personaText,
});
export type Persona = z.infer<typeof personaSchema>;
export const MAX_PERSONAS = 6;

export const MAX_COMPETITORS = 8;
export const MAX_FEATURES = 12;
export const competitorsSchema = z.object({
  items: z
    .array(
      z.object({
        id: itemId,
        name: z.string().max(80),
        url: z.string().max(300).default(""),
        notes: personaText,
        strengths: personaText,
        weaknesses: personaText,
        features: z.array(z.string().max(64)).max(MAX_FEATURES).default([]),
      }),
    )
    .max(MAX_COMPETITORS)
    .default([]),
  features: z
    .array(z.object({ id: itemId, label: z.string().max(60) }))
    .max(MAX_FEATURES)
    .default([]),
  ours: z.array(z.string().max(64)).max(MAX_FEATURES).default([]),
  positioning: personaText,
});
export type Competitors = z.infer<typeof competitorsSchema>;

export const TASK_STATUSES = ["backlog", "todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const roadmapSchema = z.object({
  milestones: z
    .array(
      z.object({ id: itemId, title: z.string().max(80), date: z.string().max(10).default("") }),
    )
    .max(8)
    .default([]),
  tasks: z
    .array(
      z.object({
        id: itemId,
        title: z.string().max(160),
        source,
        impact: rating.default(3),
        effort: rating.default(3),
        status: z.enum(TASK_STATUSES).default("backlog"),
        milestoneId: ref,
        dependsOn: ref,
      }),
    )
    .max(60)
    .default([]),
});
export type Roadmap = z.infer<typeof roadmapSchema>;
export type Task = Roadmap["tasks"][number];

export const learningSchema = z.object({
  completed: z.array(z.string().max(40)).max(50).default([]),
});

const coachMeta = {
  source: z.enum(["offline", "ai"]),
  model: z.string().max(100).optional(),
  notice: z.string().max(300).optional(),
};

export const coachResponseSchema = z.discriminatedUnion("kind", [
  z.object({ ...coachMeta, kind: z.literal("review"), review: reviewSchema }),
  z.object({ ...coachMeta, kind: z.literal("answer"), answer: answerSchema }),
  z.object({ ...coachMeta, kind: z.literal("practice"), practice: practiceFeedbackSchema }),
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

export const practiceSessionSchema = z.object({
  ...entryMeta,
  ...practiceInput,
  feedback: practiceFeedbackSchema,
});
export type PracticeSession = z.infer<typeof practiceSessionSchema>;

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
  validation: validationSchema.prefault({}),
  finance: financeSchema.prefault({}),
  practice: z.array(practiceSessionSchema).max(100).default([]),
  personas: z.array(personaSchema).max(MAX_PERSONAS).default([]),
  competitors: competitorsSchema.prefault({}),
  roadmap: roadmapSchema.prefault({}),
  learning: learningSchema.prefault({}),
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
  practice: z.strictObject(practiceInput).optional(),
});
export type CoachRequest = z.infer<typeof coachRequestSchema>;
