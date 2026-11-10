import { TEXT_MAX } from "./schema";

/** Immutable helpers for the id-keyed lists the project tools store. */
export const patchItem = <T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>,
): T[] => list.map((item) => (item.id === id ? { ...item, ...patch } : item));

export const removeItem = <T extends { id: string }>(list: T[], id: string): T[] =>
  list.filter((item) => item.id !== id);

export const lines = (text: string): string[] =>
  text
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);

/** Add a paragraph to existing text without exceeding the stored limit. */
export const appendText = (existing: string, addition: string, max: number = TEXT_MAX): string =>
  [existing.trim(), addition.trim()].filter(Boolean).join("\n\n").slice(0, max);

export const shorten = (text: string, max = 80): string => {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};
