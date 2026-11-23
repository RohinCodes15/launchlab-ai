import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProjectShell } from "./project-shell";

// Projects live only in the browser, so ProjectShell renders the <title> itself (it knows the
// project name). Clearing the inherited title keeps Next.js from rendering a second one first.
export const metadata: Metadata = { title: null };

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return <ProjectShell>{children}</ProjectShell>;
}
