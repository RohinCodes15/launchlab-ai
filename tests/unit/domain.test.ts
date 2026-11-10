import { describe, expect, test } from "vitest";
import { suggestBlock } from "@/lib/canvas";
import { DEMO_PROJECT_INPUT } from "@/lib/demo";
import { MISSING, findUnverifiedClaims, generateSlides, moveSlide } from "@/lib/pitch";
import {
  duplicateProject,
  filterProjects,
  getProgress,
  newProject,
  parseStored,
} from "@/lib/projects";
import { CANVAS_BLOCKS, projectSchema, type Project } from "@/lib/schema";

const NOW = "2026-01-01T00:00:00.000Z";
const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const blank = (name = "Blank"): Project => newProject({ name, summary: "" }, "p1", NOW);
const demo = (): Project => ({ ...blank("StudySwap"), ...DEMO_PROJECT_INPUT });

describe("projects", () => {
  test("a new project starts empty, unarchived and at 0% progress", () => {
    const project = blank();

    expect(project.idea.problem).toBe("");
    expect(project.archived).toBe(false);
    expect(getProgress(project).percent).toBe(0);
  });

  test("rejects a blank name", () => {
    expect(() => newProject({ name: "   ", summary: "" }, "p1", NOW)).toThrow();
  });

  test("progress averages the four steps", () => {
    const project = { ...demo(), slides: generateSlides(demo(), ids()) };

    const progress = getProgress(project);

    expect(progress.ideaFilled).toBe(6);
    expect(progress.canvasFilled).toBe(9);
    expect(progress.hasFeedback).toBe(false);
    expect(progress.percent).toBe(75);
  });

  test("a duplicate gets new ids, a new name, and no coach history, and leaves the source untouched", () => {
    const source = {
      ...demo(),
      isDemo: true,
      archived: true,
      slides: generateSlides(demo(), ids()),
    };
    const snapshot = structuredClone(source);

    const copy = duplicateProject(source, "p2", "2026-02-02T00:00:00.000Z", ids());

    expect(copy.id).toBe("p2");
    expect(copy.name).toBe("StudySwap (copy)");
    expect(copy.isDemo).toBe(false);
    expect(copy.archived).toBe(false);
    expect(copy.idea).toEqual(source.idea);
    expect(copy.slides.map((s) => s.body)).toEqual(source.slides.map((s) => s.body));
    expect(source).toEqual(snapshot);
    expect(projectSchema.safeParse(copy).success).toBe(true);
  });

  test("filters by archive state, status and search text, newest first", () => {
    const a = { ...blank("Alpha"), id: "a", updatedAt: "2026-01-01" };
    const b = { ...blank("Beta"), id: "b", updatedAt: "2026-01-03", status: "building" as const };
    const c = { ...blank("Gamma"), id: "c", updatedAt: "2026-01-02", archived: true };

    expect(filterProjects([a, b, c], "", "active").map((p) => p.id)).toEqual(["b", "a"]);
    expect(filterProjects([a, b, c], "", "archived").map((p) => p.id)).toEqual(["c"]);
    expect(filterProjects([a, b, c], "", "building").map((p) => p.id)).toEqual(["b"]);
    expect(filterProjects([a, b, c], " alp ", "active").map((p) => p.id)).toEqual(["a"]);
  });
});

describe("parseStored", () => {
  test("returns nothing for empty storage", () => {
    expect(parseStored(null)).toEqual({ projects: [], dropped: 0 });
  });

  test("keeps valid projects and counts damaged ones", () => {
    const raw = JSON.stringify([blank(), { id: "broken" }, "nonsense"]);

    const result = parseStored(raw);

    expect(result.projects).toHaveLength(1);
    expect(result.dropped).toBe(2);
  });

  test("treats unparseable or non-array data as damaged instead of throwing", () => {
    expect(parseStored("{not json").dropped).toBe(1);
    expect(parseStored('{"a":1}').dropped).toBe(1);
  });

  test("rejects oversized fields written by anything other than the app", () => {
    const tampered = { ...blank(), idea: { ...blank().idea, problem: "x".repeat(5000) } };

    expect(parseStored(JSON.stringify([tampered])).projects).toHaveLength(0);
  });
});

describe("canvas suggestions", () => {
  test("every block gets a draft built from the idea and marked as a draft", () => {
    const project = demo();

    for (const block of CANVAS_BLOCKS) {
      const draft = suggestBlock(block.key, project);
      expect(draft.length).toBeGreaterThan(20);
      expect(draft).toContain("Draft from your idea");
    }
    expect(suggestBlock("customerSegments", project)).toContain(project.idea.audience);
  });

  test("points back to Idea Studio when the idea is empty", () => {
    expect(suggestBlock("customerSegments", blank())).toContain("Idea Studio");
  });
});

describe("pitch", () => {
  test("generates nine slides that carry the student's own words", () => {
    const project = demo();

    const slides = generateSlides(project, ids());

    expect(slides.map((s) => s.kind)).toEqual([
      "problem",
      "solution",
      "market",
      "product",
      "business-model",
      "differentiation",
      "validation",
      "roadmap",
      "closing",
    ]);
    expect(slides[0].body).toBe(project.idea.problem);
    expect(slides[4].body).toContain(project.canvas.revenueStreams);
    expect(new Set(slides.map((s) => s.id)).size).toBe(9);
    expect(slides.every((s) => !s.body.includes(MISSING))).toBe(true);
  });

  test("marks slides whose source material is missing instead of inventing content", () => {
    const slides = generateSlides(blank(), ids());

    expect(slides.filter((s) => s.body.includes(MISSING)).length).toBeGreaterThanOrEqual(7);
  });

  test("flags statistics, money and absolute claims", () => {
    expect(findUnverifiedClaims("90% of students need this, a $2 billion market")).toEqual(
      expect.arrayContaining(["$2 billion", "90%"]),
    );
    expect(findUnverifiedClaims("We have no competitors and it is guaranteed.")).toEqual(
      expect.arrayContaining(["no competitors", "guaranteed"]),
    );
  });

  test("does not flag plain, hedged writing", () => {
    expect(findUnverifiedClaims("We plan to interview students at our school this month.")).toEqual(
      [],
    );
  });

  test("moves a slide without mutating the input, and ignores impossible moves", () => {
    const slides = generateSlides(demo(), ids());

    const moved = moveSlide(slides, 0, 1);

    expect(moved.map((s) => s.kind).slice(0, 2)).toEqual(["solution", "problem"]);
    expect(slides[0].kind).toBe("problem");
    expect(moveSlide(slides, 0, -1)).toBe(slides);
    expect(moveSlide(slides, 8, 1)).toBe(slides);
  });
});
