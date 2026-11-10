"use client";

import { useSyncExternalStore } from "react";
import { DEMO_PROJECT_INPUT } from "./demo";
import { generateSlides } from "./pitch";
import { duplicateProject, newProject, parseStored } from "./projects";
import type { NewProjectInput, Project } from "./schema";

/**
 * Projects live only in this browser's localStorage. There is no account system,
 * so nothing is sent to or stored on a server, and no one else can read or write them.
 */
const KEY = "launchlab.projects.v1";
const EMPTY: Project[] = [];

let cache: Project[] | null = null;
let saveFailed = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());
const newId = () => crypto.randomUUID();
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
      localStorage.setItem(`${KEY}.backup`, raw);
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

export function updateProject(id: string, change: (project: Project) => Project) {
  write(read().map((p) => (p.id === id ? { ...change(p), id, updatedAt: now() } : p)));
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

export function addDemoProject(): Project {
  const base = newProject(DEMO_PROJECT_INPUT, newId(), now());
  const demo = { ...base, ...DEMO_PROJECT_INPUT, isDemo: true };
  const project = { ...demo, slides: generateSlides(demo, newId) };
  write([project, ...read()]);
  return project;
}
