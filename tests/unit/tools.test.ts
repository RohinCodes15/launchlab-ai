import { describe, expect, test } from "vitest";
import { BACKUP_VERSION, applyImport, createBackup, parseBackup } from "@/lib/backup";
import { DEMO_PROJECT_INPUT } from "@/lib/demo";
import {
  breakEvenMonth,
  breakEvenUnits,
  contributionMargin,
  marginPercent,
  projectScenario,
  runwayMonths,
  summarizeScenario,
} from "@/lib/finance";
import { niceTicks } from "@/components/line-chart";
import { LESSONS, learningProgress } from "@/lib/lessons";
import { appendText } from "@/lib/list";
import {
  analyzeCompetitors,
  draftPersona,
  isBlocked,
  positioningTemplate,
  priorityScore,
  roadmapProgress,
  safeUrl,
  sortByPriority,
  suggestTasks,
} from "@/lib/planning";
import { PRACTICE_CATEGORIES, offlinePracticeFeedback, practiceStats } from "@/lib/practice";
import { applyChange, newProject, parseStored, toolSummary } from "@/lib/projects";
import {
  practiceFeedbackSchema,
  projectSchema,
  type PracticeSession,
  type Project,
  type Scenario,
  type Task,
  type Validation,
} from "@/lib/schema";
import {
  evidenceSummaryText,
  evidenceTally,
  suggestHypotheses,
  summarizeSurvey,
  validationNextSteps,
} from "@/lib/validation";

const NOW = "2026-01-01T00:00:00.000Z";
const ids = () => {
  let n = 0;
  return () => `gen-${++n}`;
};
const blank = (name = "Blank", id = "p1"): Project => newProject({ name, summary: "" }, id, NOW);
const demo = (): Project => ({ ...blank("StudySwap"), ...DEMO_PROJECT_INPUT });

const scenario = (patch: Partial<Scenario> = {}): Scenario => ({
  id: "s1",
  name: "Base",
  price: 5,
  unitsPerMonth: 10,
  growthPct: 0,
  variableCost: 2,
  fixedCosts: 30,
  startingCash: 100,
  ...patch,
});

const hypothesis = (id: string, patch: Partial<Validation["hypotheses"][number]> = {}) => ({
  id,
  statement: `Hypothesis ${id}`,
  source: "user" as const,
  priority: "medium" as const,
  confidence: 3,
  status: "untested" as const,
  ...patch,
});

const task = (id: string, patch: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  source: "user",
  impact: 3,
  effort: 3,
  status: "backlog",
  milestoneId: "",
  dependsOn: "",
  ...patch,
});

describe("data migration", () => {
  test("a project saved by version 1 (before the tools existed) still loads, with empty tools", () => {
    const v1 = {
      id: "old",
      name: "Saved last year",
      summary: "",
      status: "exploring",
      archived: false,
      isDemo: false,
      idea: {
        problem: "p",
        audience: "",
        solution: "",
        differentiation: "",
        assumptions: "",
        successCriteria: "",
      },
      canvas: {},
      slides: [],
      feedback: [],
      createdAt: NOW,
      updatedAt: NOW,
    };

    const { projects, dropped } = parseStored(JSON.stringify([v1]));

    expect(dropped).toBe(0);
    expect(projects[0].validation.hypotheses).toEqual([]);
    expect(projects[0].finance.scenarios).toEqual([]);
    expect(projects[0].personas).toEqual([]);
    expect(projects[0].roadmap.tasks).toEqual([]);
    expect(projects[0].learning.completed).toEqual([]);
    expect(projects[0].idea.problem).toBe("p");
  });

  test("applyChange refuses an edit that would break the schema, so it is never saved", () => {
    const project = blank();
    const tooMany = Array.from({ length: 31 }, (_, i) => hypothesis(`h${i}`));

    expect(
      applyChange(
        project,
        (p) => ({ ...p, validation: { ...p.validation, hypotheses: tooMany } }),
        NOW,
      ),
    ).toBeNull();
    expect(applyChange(project, (p) => ({ ...p, name: "" }), NOW)).toBeNull();
  });

  test("applyChange keeps the id and stamps the update time", () => {
    const changed = applyChange(
      blank(),
      (p) => ({ ...p, id: "hijack", summary: "new" }),
      "2026-05-05",
    );

    expect(changed?.id).toBe("p1");
    expect(changed?.summary).toBe("new");
    expect(changed?.updatedAt).toBe("2026-05-05");
  });
});

describe("finance formulas", () => {
  test("contribution margin is price minus variable cost", () => {
    expect(contributionMargin(scenario())).toBe(3);
    expect(marginPercent(scenario())).toBe(60);
    expect(marginPercent(scenario({ price: 0 }))).toBeNull();
  });

  test("break-even units round up to whole sales", () => {
    expect(breakEvenUnits(scenario())).toBe(10);
    expect(breakEvenUnits(scenario({ fixedCosts: 31 }))).toBe(11);
    expect(breakEvenUnits(scenario({ fixedCosts: 0 }))).toBe(0);
  });

  test("break-even is impossible when each sale loses or breaks even", () => {
    expect(breakEvenUnits(scenario({ variableCost: 5 }))).toBeNull();
    expect(breakEvenUnits(scenario({ variableCost: 6 }))).toBeNull();
  });

  test("projects monthly revenue, costs, net and a running cash balance", () => {
    const rows = projectScenario(scenario({ unitsPerMonth: 20 }), 3);

    expect(rows).toEqual([
      { month: 1, units: 20, revenue: 100, costs: 70, net: 30, cash: 130 },
      { month: 2, units: 20, revenue: 100, costs: 70, net: 30, cash: 160 },
      { month: 3, units: 20, revenue: 100, costs: 70, net: 30, cash: 190 },
    ]);
  });

  test("growth compounds monthly", () => {
    const rows = projectScenario(scenario({ unitsPerMonth: 100, growthPct: 10 }), 3);

    expect(rows.map((r) => Math.round(r.units * 100) / 100)).toEqual([100, 110, 121]);
  });

  test("finds the first profitable month as sales grow", () => {
    const rows = projectScenario(scenario({ unitsPerMonth: 5, growthPct: 50, startingCash: 0 }));

    // margin 3; fixed 30 → needs 10 units. 5, 7.5, 11.25 → month 3.
    expect(breakEvenMonth(rows)).toBe(3);
  });

  test("runway counts the full months before cash goes negative", () => {
    const losing = projectScenario(scenario({ unitsPerMonth: 0, startingCash: 100 }));

    // −30 a month from 100: 70, 40, 10, −20 → 3 full months.
    expect(runwayMonths(losing)).toBe(3);
    expect(runwayMonths(projectScenario(scenario({ unitsPerMonth: 20 })))).toBeNull();
    expect(runwayMonths(projectScenario(scenario({ unitsPerMonth: 0, startingCash: 0 })))).toBe(0);
  });

  test("summarises a scenario", () => {
    const summary = summarizeScenario(scenario({ unitsPerMonth: 20 }));

    expect(summary.totalRevenue).toBe(1200);
    expect(summary.endingCash).toBe(100 + 12 * 30);
    expect(summary.breakEvenMonth).toBe(1);
  });

  test("chart ticks always include zero and cover the data", () => {
    const ticks = niceTicks(-45, 190);

    expect(ticks).toContain(0);
    expect(ticks[0]).toBeLessThanOrEqual(-45);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(190);
    expect(niceTicks(0, 0)).toContain(0);
  });
});

describe("validation lab", () => {
  test("imports the student's own assumptions as theirs, then labelled suggestions, skipping duplicates", () => {
    const project = demo();
    const drafts = suggestHypotheses(project);

    expect(drafts[0]).toEqual({
      statement: "Students will tutor a stranger in exchange for tutoring.",
      source: "user",
    });
    expect(drafts.filter((d) => d.source === "user")).toHaveLength(4);
    expect(drafts.some((d) => d.source === "suggested")).toBe(true);

    const withOne = {
      ...project,
      validation: {
        ...project.validation,
        hypotheses: [hypothesis("x", { statement: drafts[0].statement })],
      },
    };
    expect(suggestHypotheses(withOne).map((d) => d.statement)).not.toContain(drafts[0].statement);
  });

  test("tallies evidence per hypothesis by direction", () => {
    const validation = blank().validation;
    const v: Validation = {
      ...validation,
      hypotheses: [hypothesis("h1")],
      evidence: [
        { id: "e1", text: "a", kind: "interview", direction: "supports", hypothesisId: "h1" },
        { id: "e2", text: "b", kind: "survey", direction: "contradicts", hypothesisId: "h1" },
        { id: "e3", text: "c", kind: "survey", direction: "contradicts", hypothesisId: "h1" },
        { id: "e4", text: "d", kind: "other", direction: "supports", hypothesisId: "" },
      ],
    };

    expect(evidenceTally(v, "h1")).toEqual({ supports: 1, contradicts: 2 });
  });

  test("summarises only the survey responses that were entered", () => {
    const v: Validation = {
      ...blank().validation,
      surveyQuestions: [
        { id: "q1", text: "How hard?", type: "scale" },
        { id: "q2", text: "Would you try it?", type: "yesno" },
        { id: "q3", text: "Why?", type: "text" },
        { id: "q4", text: "Unanswered", type: "scale" },
      ],
      surveyResponses: [
        { id: "r1", answers: { q1: "4", q2: "yes", q3: "Too expensive" } },
        { id: "r2", answers: { q1: "2", q2: "no" } },
        { id: "r3", answers: { q2: "yes" } },
      ],
    };

    const [scale, yesno, text, empty] = summarizeSurvey(v);

    expect(scale).toMatchObject({ count: 2, average: 3 });
    expect(yesno).toMatchObject({ count: 3, yesPercent: 67 });
    expect(text).toMatchObject({ count: 1, answers: ["Too expensive"] });
    expect(empty).toEqual({ id: "q4", text: "Unanswered", type: "scale", count: 0 });
  });

  test("next steps point at untested high-priority hypotheses and contradicting evidence", () => {
    const v: Validation = {
      ...blank().validation,
      hypotheses: [
        hypothesis("h1", { priority: "high", statement: "Students have the problem" }),
        hypothesis("h2", { statement: "They will pay" }),
      ],
      evidence: [
        { id: "e1", text: "no", kind: "interview", direction: "contradicts", hypothesisId: "h2" },
      ],
    };

    const steps = validationNextSteps(v);

    expect(steps[0]).toContain("Test first");
    expect(steps.some((s) => s.includes("leans against") && s.includes("They will pay"))).toBe(
      true,
    );
    expect(steps.some((s) => s.includes("5 more customer interviews"))).toBe(true);
  });

  test("flags a hypothesis marked supported without evidence", () => {
    const v: Validation = {
      ...blank().validation,
      hypotheses: [hypothesis("h1", { status: "supported" })],
    };

    expect(validationNextSteps(v).some((s) => s.includes("no supporting evidence"))).toBe(true);
  });

  test("asks for hypotheses first when there are none", () => {
    expect(validationNextSteps(blank().validation)).toEqual([
      expect.stringContaining("Add your riskiest assumptions"),
    ]);
  });

  test("the evidence summary reports recorded counts only", () => {
    const text = evidenceSummaryText(blank().validation);

    expect(text).toContain("0 interviews, 0 survey responses, 0 pieces of evidence");
  });
});

describe("pitch practice", () => {
  test("a thin answer scores low and says what is missing", () => {
    const feedback = offlinePracticeFeedback("problem", "It is hard.");

    expect(practiceFeedbackSchema.safeParse(feedback).success).toBe(true);
    expect(feedback.clarity).toBeLessThanOrEqual(3);
    expect(feedback.completeness).toBe(1);
    expect(feedback.improvements.some((i) => i.includes("too short"))).toBe(true);
  });

  test("a complete answer scores higher and credits real evidence", () => {
    const answer =
      "Sophomores at our school fall behind in chemistry before every test because office hours fill up and tutors cost money they do not have. We interviewed eight students last month and five said they missed help before the last exam, which hurt their grades.";
    const feedback = offlinePracticeFeedback("problem", answer);

    expect(feedback.completeness).toBe(5);
    expect(feedback.clarity).toBeGreaterThanOrEqual(4);
    expect(feedback.strengths.some((s) => s.includes("something you actually did"))).toBe(true);
  });

  test("flags hedging and unverified numbers", () => {
    const feedback = offlinePracticeFeedback(
      "business-model",
      "I think maybe we kind of charge per month, probably, and 90% of schools will pay us because it is the best option and stuff.",
    );

    expect(feedback.improvements.some((i) => i.includes("weaken"))).toBe(true);
    expect(feedback.improvements.some((i) => i.includes("90%"))).toBe(true);
  });

  test("labels itself as rule-based", () => {
    expect(offlinePracticeFeedback("ask", "We need testers.").summary).toContain("Rule-based");
  });

  test("every category has questions and checks", () => {
    for (const category of PRACTICE_CATEGORIES) {
      expect(category.questions.length).toBeGreaterThan(0);
      expect(category.checks.length).toBeGreaterThan(0);
    }
  });

  test("progress averages recent sessions and surfaces advice that repeats", () => {
    const session = (clarity: number, improvements: string[]): PracticeSession => ({
      id: `s${clarity}`,
      createdAt: NOW,
      source: "offline",
      category: "problem",
      question: "q",
      response: "r",
      feedback: { summary: "s", clarity, completeness: 3, strengths: [], improvements },
    });

    const stats = practiceStats([
      session(5, ["Mention cost."]),
      session(3, ["Mention cost.", "Shorter."]),
    ]);

    expect(stats).toEqual({ count: 2, clarity: 4, completeness: 3, recurring: ["Mention cost."] });
    expect(practiceStats([]).clarity).toBeNull();
  });
});

describe("backup", () => {
  test("round-trips projects through the backup format unchanged", () => {
    const projects = [demo(), blank("Second", "p2")];

    const parsed = parseBackup(JSON.stringify(createBackup(projects, NOW)));

    expect(parsed).toEqual({ ok: true, projects, dropped: 0, exportedAt: NOW });
  });

  test("records the format and version", () => {
    expect(createBackup([], NOW)).toMatchObject({
      format: "launchlab-backup",
      version: BACKUP_VERSION,
    });
  });

  test("restores the readable projects from a partly damaged file and counts the rest", () => {
    const file = { ...createBackup([blank()], NOW), projects: [blank(), { id: "x" }, null] };

    const parsed = parseBackup(JSON.stringify(file));

    expect(parsed.ok && parsed.projects).toHaveLength(1);
    expect(parsed.ok && parsed.dropped).toBe(2);
  });

  test("accepts a raw storage array, for recovering browser data", () => {
    const parsed = parseBackup(JSON.stringify([blank()]));

    expect(parsed.ok).toBe(true);
  });

  test.each([
    ["invalid JSON", "{nope", "not valid JSON"],
    ["another app's file", JSON.stringify({ hello: "world" }), "not a LaunchLab backup"],
    [
      "a newer format",
      JSON.stringify({ ...createBackup([blank()], NOW), version: 99 }),
      "newer version",
    ],
    ["no readable projects", JSON.stringify(createBackup([], NOW)), "No readable projects"],
  ])("rejects %s with a clear message", (_label, text, message) => {
    const parsed = parseBackup(text);

    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error).toContain(message);
  });

  test("rejects files over the size limit", () => {
    const parsed = parseBackup(" ".repeat(5_000_001));

    expect(!parsed.ok && parsed.error).toContain("too large");
  });

  test("merge keeps existing projects and adds clashing ids as separate copies", () => {
    const existing = [blank("Mine", "a")];
    const incoming = [blank("Theirs", "a"), blank("New", "b")];

    const result = applyImport(existing, incoming, "merge", ids());

    expect(result.map((p) => [p.id, p.name])).toEqual([
      ["gen-1", "Theirs (imported)"],
      ["b", "New"],
      ["a", "Mine"],
    ]);
  });

  test("merge also separates duplicate ids inside the same file", () => {
    const result = applyImport([], [blank("One", "a"), blank("Two", "a")], "merge", ids());

    expect(new Set(result.map((p) => p.id)).size).toBe(2);
  });

  test("replace keeps only the imported projects", () => {
    const result = applyImport([blank("Mine", "a")], [blank("Theirs", "a")], "replace", ids());

    expect(result.map((p) => p.name)).toEqual(["Theirs"]);
  });

  test("an imported project with oversized fields is rejected, not stored", () => {
    const bad = {
      ...blank(),
      personas: Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, name: "x" })),
    };

    expect(parseBackup(JSON.stringify([bad])).ok).toBe(false);
  });
});

describe("personas, competitors and roadmap", () => {
  test("a drafted persona copies the idea, is labelled suggested and assumption, and marks unknowns", () => {
    const persona = draftPersona(demo());

    expect(persona.source).toBe("suggested");
    expect(persona.basis).toBe("assumption");
    expect(persona.who).toBe(DEMO_PROJECT_INPUT.idea.audience);
    expect(persona.goals).toContain("Unknown");
  });

  test("only http and https links are treated as links", () => {
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,hi")).toBeUndefined();
    expect(safeUrl("not a url")).toBeUndefined();
  });

  test("competitor analysis is computed from the ticked features", () => {
    const competitors = {
      features: [
        { id: "f1", label: "Free" },
        { id: "f2", label: "Mobile app" },
        { id: "f3", label: "Matching" },
      ],
      ours: ["f1", "f3"],
      items: [
        {
          id: "c1",
          name: "A",
          url: "",
          notes: "",
          strengths: "",
          weaknesses: "",
          features: ["f2", "f3"],
        },
        {
          id: "c2",
          name: "B",
          url: "",
          notes: "",
          strengths: "",
          weaknesses: "",
          features: ["f2"],
        },
      ],
      positioning: "",
    };

    const analysis = analyzeCompetitors(competitors);

    expect(analysis.onlyUs.map((f) => f.label)).toEqual(["Free"]);
    expect(analysis.gaps.map((f) => f.label)).toEqual(["Mobile app"]);
    expect(analysis.shared.map((f) => f.label)).toEqual(["Matching"]);
  });

  test("the positioning template uses the student's words and leaves blanks visible", () => {
    expect(positioningTemplate(demo())).toContain("StudySwap is");
    expect(positioningTemplate(blank())).toContain("[target audience]");
  });

  test("priority is impact over effort, highest first", () => {
    expect(priorityScore({ impact: 5, effort: 2 })).toBe(2.5);
    expect(
      sortByPriority([task("a", { impact: 1 }), task("b", { impact: 5, effort: 1 })]).map(
        (t) => t.id,
      ),
    ).toEqual(["b", "a"]);
  });

  test("a task is blocked until the task it depends on is done", () => {
    const first = task("a");
    const second = task("b", { dependsOn: "a" });

    expect(isBlocked(second, [first, second])).toBe(true);
    expect(isBlocked(second, [{ ...first, status: "done" }, second])).toBe(false);
    expect(isBlocked(task("c", { dependsOn: "deleted" }), [])).toBe(false);
  });

  test("roadmap progress counts done tasks overall and per milestone", () => {
    const roadmap = {
      milestones: [{ id: "m1", title: "Pilot", date: "" }],
      tasks: [
        task("a", { status: "done", milestoneId: "m1" }),
        task("b", { milestoneId: "m1" }),
        task("c", { status: "done" }),
      ],
    };

    expect(roadmapProgress(roadmap)).toEqual({ done: 2, total: 3, percent: 67 });
    expect(roadmapProgress(roadmap, "m1")).toEqual({ done: 1, total: 2, percent: 50 });
    expect(roadmapProgress({ milestones: [], tasks: [] }).percent).toBe(0);
  });

  test("suggested tasks mention the audience and skip ones already on the board", () => {
    const project = demo();
    const suggestions = suggestTasks(project);

    expect(suggestions[0]).toContain("Sophomores and juniors");
    const withOne = {
      ...project,
      roadmap: { ...project.roadmap, tasks: [task("x", { title: suggestions[0] })] },
    };
    expect(suggestTasks(withOne)).not.toContain(suggestions[0]);
  });
});

describe("learning hub", () => {
  test("every quiz answer points at a real option and every lesson has a task", () => {
    for (const lesson of LESSONS) {
      expect(lesson.quiz.length).toBeGreaterThan(0);
      for (const q of lesson.quiz) expect(q.options[q.answer]).toBeDefined();
      expect(lesson.task.isDone(blank())).toBe(false);
    }
  });

  test("tasks are detected from the real project", () => {
    expect(LESSONS[0].task.isDone(demo())).toBe(true);
  });

  test("progress counts completed lessons", () => {
    const project = { ...blank(), learning: { completed: [LESSONS[0].id] } };

    expect(learningProgress(project)).toEqual({ done: 1, total: LESSONS.length, percent: 20 });
  });
});

describe("integration helpers", () => {
  test("appendText adds a paragraph without exceeding the limit", () => {
    expect(appendText("", "new")).toBe("new");
    expect(appendText("old", "new")).toBe("old\n\nnew");
    expect(appendText("x".repeat(1995), "more text").length).toBe(2000);
  });

  test("dashboard tool summary reflects recorded work", () => {
    const project: Project = {
      ...blank(),
      validation: {
        ...blank().validation,
        hypotheses: [hypothesis("h1", { status: "supported" }), hypothesis("h2")],
      },
      roadmap: { milestones: [], tasks: [task("a", { status: "done" }), task("b")] },
    };

    expect(toolSummary(project)).toEqual(["1/2 hypotheses tested", "1/2 tasks done"]);
    expect(toolSummary(blank())).toEqual([]);
  });

  test("a fully populated project is valid against the schema", () => {
    const project: Project = {
      ...demo(),
      personas: [{ ...draftPersona(demo()), id: "persona" }],
      finance: { scenarios: [scenario()] },
      roadmap: { milestones: [], tasks: [task("a")] },
    };

    expect(projectSchema.safeParse(project).success).toBe(true);
  });
});
