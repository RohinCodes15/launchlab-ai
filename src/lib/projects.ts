import {
  CANVAS_BLOCKS,
  IDEA_FIELDS,
  projectSchema,
  type NewProjectInput,
  type Project,
  type Status,
} from "./schema";

export function newProject(input: NewProjectInput, id: string, now: string): Project {
  return projectSchema.parse({ ...input, id, createdAt: now, updatedAt: now });
}

/** A private copy: same idea, canvas and slides, fresh identity, no coach history. */
export function duplicateProject(
  source: Project,
  id: string,
  now: string,
  newSlideId: () => string,
): Project {
  return {
    ...source,
    id,
    name: `${source.name} (copy)`.slice(0, 80),
    isDemo: false,
    archived: false,
    feedback: [],
    slides: source.slides.map((slide) => ({ ...slide, id: newSlideId() })),
    createdAt: now,
    updatedAt: now,
  };
}

const filled = (value: string) => value.trim().length > 0;

export type Progress = {
  ideaFilled: number;
  ideaTotal: number;
  canvasFilled: number;
  canvasTotal: number;
  hasFeedback: boolean;
  hasPitch: boolean;
  percent: number;
};

export function getProgress(project: Project): Progress {
  const ideaFilled = IDEA_FIELDS.filter((f) => filled(project.idea[f.key])).length;
  const canvasFilled = CANVAS_BLOCKS.filter((b) => filled(project.canvas[b.key])).length;
  const hasFeedback = project.feedback.some((entry) => entry.kind === "review");
  const hasPitch = project.slides.length > 0;
  const parts = [
    ideaFilled / IDEA_FIELDS.length,
    hasFeedback ? 1 : 0,
    canvasFilled / CANVAS_BLOCKS.length,
    hasPitch ? 1 : 0,
  ];
  return {
    ideaFilled,
    ideaTotal: IDEA_FIELDS.length,
    canvasFilled,
    canvasTotal: CANVAS_BLOCKS.length,
    hasFeedback,
    hasPitch,
    percent: Math.round((parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100),
  };
}

export type ProjectView = "active" | "archived" | Status;

export function filterProjects(projects: Project[], query: string, view: ProjectView): Project[] {
  const needle = query.trim().toLowerCase();
  return projects
    .filter((p) => (view === "archived" ? p.archived : !p.archived))
    .filter((p) => view === "active" || view === "archived" || p.status === view)
    .filter((p) => !needle || `${p.name} ${p.summary}`.toLowerCase().includes(needle))
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Parse what is in browser storage. Each project is validated on its own so one
 * damaged record cannot take the rest down with it.
 */
export function parseStored(raw: string | null): { projects: Project[]; dropped: number } {
  if (!raw) return { projects: [], dropped: 0 };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { projects: [], dropped: 1 };
  }
  if (!Array.isArray(data)) return { projects: [], dropped: 1 };
  const results = data.map((item) => projectSchema.safeParse(item));
  const projects = results.flatMap((result) => (result.success ? [result.data] : []));
  return { projects, dropped: results.length - projects.length };
}
