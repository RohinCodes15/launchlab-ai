"use client";

import { useParams } from "next/navigation";
import type { Project } from "@/lib/schema";
import { useProjects } from "@/lib/store";

export function useCurrentProject(): { project: Project | undefined; ready: boolean } {
  const { id } = useParams<{ id: string }>();
  const { projects, ready } = useProjects();
  return { project: projects.find((p) => p.id === id), ready };
}
