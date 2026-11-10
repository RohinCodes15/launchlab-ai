import { z } from "zod";
import { projectSchema, type Project } from "./schema";

export const BACKUP_FORMAT = "launchlab-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5_000_000;
const MAX_PROJECTS = 200;

const envelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1),
  exportedAt: z.string(),
  projects: z.array(z.unknown()),
});

export type Backup = { format: string; version: number; exportedAt: string; projects: Project[] };

export const createBackup = (projects: Project[], now: string): Backup => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: now,
  projects,
});

export type ParsedBackup =
  | { ok: true; projects: Project[]; dropped: number; exportedAt?: string }
  | { ok: false; error: string };

/**
 * Read a backup file. Never trusts the file: every project is re-validated against
 * the current schema, one at a time, so a partly damaged file still restores what
 * it can and reports how many records were unreadable.
 */
export function parseBackup(text: string): ParsedBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    return { ok: false, error: "That file is too large to be a LaunchLab backup (limit 5 MB)." };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON, so nothing could be read from it." };
  }

  // A bare array is the raw browser-storage shape: accept it as a recovery path.
  const envelope = Array.isArray(data) ? undefined : envelopeSchema.safeParse(data);
  if (envelope && !envelope.success) {
    return { ok: false, error: "That file is not a LaunchLab backup." };
  }
  if (envelope && envelope.data.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `That backup was made by a newer version of LaunchLab (format ${envelope.data.version}). Update the app, then import again.`,
    };
  }
  const items = envelope ? envelope.data.projects : (data as unknown[]);
  if (items.length > MAX_PROJECTS) {
    return { ok: false, error: `That file holds more than ${MAX_PROJECTS} projects.` };
  }
  const results = items.map((item) => projectSchema.safeParse(item));
  const projects = results.flatMap((result) => (result.success ? [result.data] : []));
  if (projects.length === 0) {
    return { ok: false, error: "No readable projects were found in that file." };
  }
  return {
    ok: true,
    projects,
    dropped: results.length - projects.length,
    exportedAt: envelope?.data.exportedAt,
  };
}

export type ImportMode = "merge" | "replace";

/**
 * Merge keeps everything you have and adds the imported projects. An imported
 * project whose id is already in use (here, or earlier in the same file) is added
 * as a separate copy with a new id, so nothing is overwritten.
 * Replace discards the current projects and keeps only the imported ones.
 */
export function applyImport(
  existing: Project[],
  incoming: Project[],
  mode: ImportMode,
  newId: () => string,
): Project[] {
  const taken = new Set(mode === "merge" ? existing.map((p) => p.id) : []);
  const imported = incoming.map((project) => {
    const clash = taken.has(project.id);
    const next = clash
      ? { ...project, id: newId(), name: `${project.name} (imported)`.slice(0, 80) }
      : project;
    taken.add(next.id);
    return next;
  });
  return mode === "merge" ? [...imported, ...existing] : imported;
}
