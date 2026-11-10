"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, EmptyState, ProgressBar, buttonClass } from "@/components/ui";
import { useCurrentProject } from "@/components/use-current-project";
import { getProgress } from "@/lib/projects";
import { STATUS_LABELS } from "@/lib/schema";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { project, ready } = useCurrentProject();
  const pathname = usePathname();

  if (!ready) {
    return (
      <div
        role="status"
        aria-label="Loading project"
        className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"
      >
        <div className="h-10 w-64 animate-pulse rounded-lg bg-raised" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-raised" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <EmptyState
          title="Project not found."
          actions={
            <Link href="/dashboard" className={buttonClass("primary")}>
              Back to dashboard
            </Link>
          }
        >
          Projects are stored in the browser where they were created. This one does not exist on
          this device, or it was deleted.
        </EmptyState>
      </div>
    );
  }

  const progress = getProgress(project);
  const base = `/projects/${project.id}`;
  const tabs = [
    { href: base, label: "Idea", done: progress.ideaFilled === progress.ideaTotal },
    { href: `${base}/coach`, label: "Coach", done: progress.hasFeedback },
    {
      href: `${base}/canvas`,
      label: "Canvas",
      done: progress.canvasFilled === progress.canvasTotal,
    },
    { href: `${base}/pitch`, label: "Pitch", done: progress.hasPitch },
  ];
  const tools = [
    { href: `${base}/validation`, label: "Validation" },
    { href: `${base}/personas`, label: "Personas" },
    { href: `${base}/competitors`, label: "Competitors" },
    { href: `${base}/finance`, label: "Finance" },
    { href: `${base}/roadmap`, label: "Roadmap" },
    { href: `${base}/practice`, label: "Practice" },
    { href: `${base}/learn`, label: "Learn" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="no-print">
        <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
          ← All projects
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl sm:text-5xl">{project.name}</h1>
          <Badge tone="accent">{STATUS_LABELS[project.status]}</Badge>
          {project.isDemo && <Badge>Demo</Badge>}
        </div>
        <div className="mt-4 flex max-w-sm items-center gap-3 text-xs text-muted">
          <ProgressBar percent={progress.percent} label="Project progress" />
          <span className="shrink-0">{progress.percent}%</span>
        </div>
        <nav
          aria-label="Project steps"
          className="mt-6 flex gap-1 overflow-x-auto border-b border-line"
        >
          {tabs.map((tab, index) => {
            const current = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  current ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-5 place-items-center rounded-full text-[11px] ${
                    tab.done ? "bg-accent text-accent-fg" : "border border-line"
                  }`}
                >
                  {tab.done ? "✓" : index + 1}
                </span>
                {tab.label}
                {tab.done && <span className="sr-only">(complete)</span>}
              </Link>
            );
          })}
          <span aria-hidden className="mx-1 my-2 w-px shrink-0 bg-line" />
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              aria-current={pathname === tool.href ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === tool.href
                  ? "border-accent text-fg"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {tool.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="py-8 print:py-0">{children}</div>
    </div>
  );
}
