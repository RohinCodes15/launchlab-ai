import { shorten } from "./list";
import type { Competitors, Persona, Project, Roadmap, Task } from "./schema";

/** Persona, competitor and roadmap logic. Drafts are templates over the student's own text. */

const ASK = "Unknown. Ask in interviews";

/** A starting persona that copies what the student wrote and marks the rest as unknown. */
export function draftPersona(project: Project): Omit<Persona, "id"> {
  const { idea } = project;
  return {
    name: "Draft persona",
    source: "suggested",
    basis: "assumption",
    who: idea.audience.trim() || `${ASK}: who has this problem most often?`,
    goals: `${ASK}: what are they trying to get done when the problem appears?`,
    pains: idea.problem.trim().slice(0, 600) || `${ASK}: what is frustrating today?`,
    needs: idea.solution.trim()
      ? `A way to get: ${shorten(idea.solution, 500)}`
      : `${ASK}: what would help?`,
    behaviors: `${ASK}: what do they do today instead, and where do they spend time?`,
    motivations:
      idea.differentiation.trim().slice(0, 600) || `${ASK}: what would make them switch?`,
  };
}

/** Text for the canvas, added only when the student presses the button. */
export const personaSegmentText = (persona: Persona): string =>
  `${persona.name}: ${persona.who.trim() || "(not described yet)"}${
    persona.basis === "assumption" ? " (assumption, not yet verified)" : ""
  }`;

/** Only http and https links are ever rendered as links. */
export function safeUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

/** Feature comparison computed from the checkboxes the student ticked. */
export function analyzeCompetitors(competitors: Competitors) {
  const { features, items, ours } = competitors;
  const have = (featureId: string) =>
    items.filter((item) => item.features.includes(featureId)).length;
  return {
    onlyUs: features.filter((f) => ours.includes(f.id) && have(f.id) === 0),
    gaps: features.filter(
      (f) => !ours.includes(f.id) && items.length > 0 && have(f.id) === items.length,
    ),
    shared: features.filter((f) => ours.includes(f.id) && have(f.id) > 0),
  };
}

export function positioningTemplate(project: Project): string {
  const { idea, competitors, name } = project;
  const rivals = competitors.items.map((item) => item.name.trim()).filter(Boolean);
  const edge = analyzeCompetitors(competitors).onlyUs.map((f) => f.label);
  return [
    `For ${shorten(idea.audience, 120) || "[target audience]"}`,
    `who ${shorten(idea.problem, 160) || "[have this problem]"},`,
    `${name} is ${shorten(idea.solution, 160) || "[what it is]"}.`,
    `Unlike ${rivals.length > 0 ? rivals.join(", ") : "[what they use today]"},`,
    `we ${edge.length > 0 ? `offer ${edge.join(", ")}` : "[one difference you can show]"}.`,
  ].join(" ");
}

/** Impact divided by effort: higher means more value for less work. */
export const priorityScore = (task: Pick<Task, "impact" | "effort">): number =>
  Math.round((task.impact / task.effort) * 10) / 10;

export const sortByPriority = (tasks: Task[]): Task[] =>
  tasks.toSorted((a, b) => priorityScore(b) - priorityScore(a) || a.title.localeCompare(b.title));

/** A task is blocked while the task it depends on exists and is not done. */
export function isBlocked(task: Task, tasks: Task[]): boolean {
  const dependency = tasks.find((other) => other.id === task.dependsOn);
  return Boolean(dependency) && dependency?.status !== "done";
}

export function roadmapProgress(roadmap: Roadmap, milestoneId?: string) {
  const tasks = milestoneId
    ? roadmap.tasks.filter((t) => t.milestoneId === milestoneId)
    : roadmap.tasks;
  const done = tasks.filter((t) => t.status === "done").length;
  return {
    done,
    total: tasks.length,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}

/** Generic first steps toward an MVP, phrased around this project. Skips titles already on the board. */
export function suggestTasks(project: Project): string[] {
  const audience = shorten(project.idea.audience, 60) || "target users";
  const existing = new Set(project.roadmap.tasks.map((t) => t.title.trim().toLowerCase()));
  return [
    `Interview five people from: ${audience}`,
    "List the one thing the first version must do",
    "Sketch the main screen or flow on paper",
    "Build a clickable mock-up or a manual version",
    `Test it with three people from: ${audience}`,
    "Write down what confused testers and fix the top issue",
    "Decide the success number for a first small launch",
  ].filter((title) => !existing.has(title.toLowerCase()));
}
