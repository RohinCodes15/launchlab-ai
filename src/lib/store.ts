"use client";

import { useSyncExternalStore } from "react";
import { applyImport, type ImportMode } from "./backup";
import { DEMO_PROJECT_INPUT } from "./demo";
import { DEFAULT_SCENARIO } from "./finance";
import { generateSlides } from "./pitch";
import { draftPersona, suggestTasks } from "./planning";
import { applyChange, duplicateProject, newProject, parseStored } from "./projects";
import { suggestHypotheses } from "./validation";
import type { NewProjectInput, Project } from "./schema";

/**
 * Projects live only in this browser's localStorage. There is no account system,
 * so nothing is sent to or stored on a server, and no one else can read or write them.
 */
const KEY = "launchlab.projects.v1";
const RECOVERY_KEY = `${KEY}.backup`;
const EMPTY: Project[] = [];

let cache: Project[] | null = null;
let saveFailed = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());
export const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function read(): Project[] {
  if (cache) return cache;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    saveFailed = true;
  }
  const { projects, dropped } = parseStored(raw);
  if (dropped > 0 && raw) {
    // Keep the unreadable original so a later save cannot destroy it.
    try {
      localStorage.setItem(RECOVERY_KEY, raw);
    } catch {
      saveFailed = true;
    }
  }
  cache = projects;
  return cache;
}

function write(next: Project[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    saveFailed = false;
  } catch {
    saveFailed = true;
  }
  notify();
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

/** `ready` is false during server render and hydration, when storage cannot be read yet. */
export function useProjects(): { projects: Project[]; ready: boolean } {
  const projects = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { projects, ready };
}

export function useSaveFailed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => saveFailed,
    () => false,
  );
}

export function createProject(input: NewProjectInput): Project {
  const project = newProject(input, newId(), now());
  write([project, ...read()]);
  return project;
}

/** Returns false, and saves nothing, when the change would produce an invalid project. */
export function updateProject(id: string, change: (project: Project) => Project): boolean {
  const current = read().find((p) => p.id === id);
  const next = current && applyChange(current, change, now());
  if (!next) return false;
  write(read().map((p) => (p.id === id ? next : p)));
  return true;
}

export function removeProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function copyProject(id: string): Project | undefined {
  const source = read().find((p) => p.id === id);
  if (!source) return undefined;
  const copy = duplicateProject(source, newId(), now(), newId);
  write([copy, ...read()]);
  return copy;
}

/** The demo ships with drafts and assumptions only: no invented interviews, responses or evidence. */
export function addDemoProject(): Project {
  const base = newProject(DEMO_PROJECT_INPUT, newId(), now());
  const demo: Project = { ...base, ...DEMO_PROJECT_INPUT, isDemo: true };
  const project: Project = {
    ...demo,
    slides: generateSlides(demo, newId),
    validation: {
      ...demo.validation,
      hypotheses: suggestHypotheses(demo).map((draft) => ({
        ...draft,
        id: newId(),
        priority: "medium",
        confidence: 3,
        status: "untested",
      })),
    },
    finance: { scenarios: [{ ...DEFAULT_SCENARIO, id: newId(), name: "School pilot" }] },
    personas: [{ ...draftPersona(demo), id: newId() }],
    roadmap: {
      ...demo.roadmap,
      tasks: suggestTasks(demo).map((title) => ({
        id: newId(),
        title,
        source: "suggested",
        impact: 3,
        effort: 3,
        status: "backlog",
        milestoneId: "",
        dependsOn: "",
      })),
    },
  };
  write([project, ...read()]);
  return project;
}

export function importProjects(incoming: Project[], mode: ImportMode) {
  write(applyImport(read(), incoming, mode, newId));
}

/** The original stored text, kept when some saved projects could not be read. */
export function readRecoveryCopy(): string | null {
  try {
    return localStorage.getItem(RECOVERY_KEY);
  } catch {
    return null;
  }
}

export function useRecoveryCopy(): string | null {
  return useSyncExternalStore(subscribe, readRecoveryCopy, () => null);
}

export function clearRecoveryCopy() {
  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  notify();
}
