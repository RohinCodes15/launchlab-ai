"use client";

import { useParams } from "next/navigation";
import type { Project } from "@/lib/schema";
import { updateProject, useProjects } from "@/lib/store";

export function useCurrentProject(): { project: Project | undefined; ready: boolean } {
  const { id } = useParams<{ id: string }>();
  const { projects, ready } = useProjects();
  return { project: projects.find((p) => p.id === id), ready };
}

/** One tool's slice of the current project, with an immutable save function. */
export function useProjectSlice<K extends keyof Project>(key: K) {
  const { project } = useCurrentProject();
  const save = (change: (value: Project[K]) => Project[K]) => {
    if (project) updateProject(project.id, (p) => ({ ...p, [key]: change(p[key]) }));
  };
  return { project, save };
}
