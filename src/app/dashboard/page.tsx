"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Confirm,
  EmptyState,
  Field,
  Modal,
  ProgressBar,
  inputBase,
  inputClass,
} from "@/components/ui";
import { filterProjects, getProgress, toolSummary, type ProjectView } from "@/lib/projects";
import {
  NAME_MAX,
  STATUSES,
  STATUS_LABELS,
  SUMMARY_MAX,
  newProjectSchema,
  type Project,
} from "@/lib/schema";
import {
  addDemoProject,
  copyProject,
  createProject,
  removeProject,
  updateProject,
  useProjects,
} from "@/lib/store";

const VIEWS: { value: ProjectView; label: string }[] = [
  { value: "active", label: "All active" },
  ...STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
  { value: "archived", label: "Archived" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function NewProjectForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = newProjectSchema.safeParse({
      name: String(form.get("name") ?? ""),
      summary: String(form.get("summary") ?? ""),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    onCancel(); // close the dialog so it is not kept open inside the hidden dashboard
    router.push(`/projects/${createProject(parsed.data).id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Project name" error={error}>
        {({ id, describedBy }) => (
          <input
            id={id}
            name="name"
            autoFocus
            maxLength={NAME_MAX}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            placeholder="e.g. StudySwap"
            className={inputClass}
          />
        )}
      </Field>
      <Field label="One-line summary" hint="Optional. You can change it later.">
        {({ id, describedBy }) => (
          <input
            id={id}
            name="summary"
            maxLength={SUMMARY_MAX}
            aria-describedby={describedBy}
            placeholder="What is it, in one sentence?"
            className={inputClass}
          />
        )}
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">
          Create project
        </Button>
      </div>
    </form>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const progress = getProgress(project);
  return (
    <li className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl leading-tight">
          <Link href={`/projects/${project.id}`} className="hover:text-accent">
            {project.name}
          </Link>
        </h2>
        <div className="flex shrink-0 gap-1.5">
          {project.isDemo && <Badge>Demo</Badge>}
          <Badge tone="accent">{STATUS_LABELS[project.status]}</Badge>
        </div>
      </div>
      <p className="mt-1 min-h-10 text-sm text-muted">{project.summary || "No summary yet."}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>{progress.percent}% complete</span>
          <span>Updated {formatDate(project.updatedAt)}</span>
        </div>
        <ProgressBar percent={progress.percent} label={`${project.name} progress`} />
      </div>
      {toolSummary(project).length > 0 && (
        <p className="mt-3 text-xs text-muted">{toolSummary(project).join(" · ")}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-1 border-t border-line pt-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => copyProject(project.id)}
          aria-label={`Duplicate ${project.name}`}
        >
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`${project.archived ? "Restore" : "Archive"} ${project.name}`}
          onClick={() => updateProject(project.id, (p) => ({ ...p, archived: !p.archived }))}
        >
          {project.archived ? "Restore" : "Archive"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto !text-danger"
          onClick={onDelete}
          aria-label={`Delete ${project.name}`}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, ready } = useProjects();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ProjectView>("active");
  const [isCreating, setIsCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project>();

  const visible = filterProjects(projects, query, view);
  const openDemo = () => router.push(`/projects/${addDemoProject().id}`);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Your projects</h1>
          <p className="mt-2 text-muted">
            Saved in this browser only. Nothing is uploaded.{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-fg">
              How your data is stored
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openDemo}>Add demo project</Button>
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            New project
          </Button>
        </div>
      </div>

      {!ready ? (
        <div
          role="status"
          aria-label="Loading projects"
          className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-48 animate-pulse rounded-2xl bg-raised" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Start with one idea."
            actions={
              <>
                <Button variant="primary" onClick={() => setIsCreating(true)}>
                  Create your first project
                </Button>
                <Button onClick={openDemo}>Explore the demo project</Button>
              </>
            }
          >
            A project holds your idea, coach feedback, business model canvas, and pitch. Not sure
            where to begin? Open the demo to see a finished example.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className={`${inputBase} w-full max-w-xs`}
            />
            <select
              value={view}
              onChange={(event) => setView(event.target.value as ProjectView)}
              aria-label="Filter projects"
              className={`${inputBase}`}
            >
              {VIEWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {visible.length === 0 ? (
            <p className="mt-10 text-center text-muted">No projects match this search or filter.</p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => setDeleting(project)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <Modal open={isCreating} onClose={() => setIsCreating(false)} title="New project">
        <NewProjectForm onCancel={() => setIsCreating(false)} />
      </Modal>
      <Confirm
        open={Boolean(deleting)}
        title="Delete this project?"
        confirmLabel="Delete project"
        danger
        onClose={() => setDeleting(undefined)}
        onConfirm={() => deleting && removeProject(deleting.id)}
      >
        “{deleting?.name}” and its feedback, canvas, and pitch will be removed from this browser.
        This cannot be undone.
      </Confirm>
    </div>
  );
}
