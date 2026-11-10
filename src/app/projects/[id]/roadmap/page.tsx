"use client";

import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Panel,
  ProgressBar,
  Select,
  SourceBadge,
  ToolHeader,
  inputBase,
  inputClass,
} from "@/components/ui";
import { useProjectSlice } from "@/components/use-current-project";
import { patchItem, removeItem, shorten } from "@/lib/list";
import {
  isBlocked,
  priorityScore,
  roadmapProgress,
  sortByPriority,
  suggestTasks,
} from "@/lib/planning";
import { TASK_STATUSES, type Roadmap, type Task, type TaskStatus } from "@/lib/schema";
import { newId } from "@/lib/store";

const MAX_TASKS = 60;
const MAX_MILESTONES = 8;
const COLUMN_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  doing: "Doing",
  done: "Done",
};
const RATINGS = ["1", "2", "3", "4", "5"];

const newTask = (title: string, source: Task["source"]): Task => ({
  id: newId(),
  title: title.slice(0, 160),
  source,
  impact: 3,
  effort: 3,
  status: "backlog",
  milestoneId: "",
  dependsOn: "",
});

function TaskCard({
  task,
  roadmap,
  save,
}: {
  task: Task;
  roadmap: Roadmap;
  save: (change: (r: Roadmap) => Roadmap) => void;
}) {
  const edit = (patch: Partial<Task>) =>
    save((r) => ({ ...r, tasks: patchItem(r.tasks, task.id, patch) }));
  const column = TASK_STATUSES.indexOf(task.status);
  const blocked = isBlocked(task, roadmap.tasks);
  const name = `“${shorten(task.title, 40) || "untitled task"}”`;
  const dependencyOptions = [
    { value: "", label: "No dependency" },
    ...roadmap.tasks
      .filter((t) => t.id !== task.id && t.dependsOn !== task.id)
      .map((t) => ({ value: t.id, label: `After: ${shorten(t.title, 40)}` })),
  ];

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
      <textarea
        aria-label={`Task ${name}`}
        rows={2}
        maxLength={160}
        value={task.title}
        onChange={(e) => edit({ title: e.target.value })}
        className={`${inputClass} resize-y`}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={task.source} />
        <Badge tone="accent">Score {priorityScore(task)}</Badge>
        {blocked && <Badge tone="warn">Blocked</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Select
          label={`Impact of ${name}`}
          value={String(task.impact)}
          options={RATINGS.map((v) => ({ value: v, label: `Impact ${v}` }))}
          onChange={(v) => edit({ impact: Number(v) })}
        />
        <Select
          label={`Effort of ${name}`}
          value={String(task.effort)}
          options={RATINGS.map((v) => ({ value: v, label: `Effort ${v}` }))}
          onChange={(v) => edit({ effort: Number(v) })}
        />
      </div>
      {roadmap.milestones.length > 0 && (
        <Select
          label={`Milestone of ${name}`}
          value={task.milestoneId}
          options={[
            { value: "", label: "No milestone" },
            ...roadmap.milestones.map((m) => ({
              value: m.id,
              label: m.title || "Untitled milestone",
            })),
          ]}
          onChange={(milestoneId) => edit({ milestoneId })}
          className="w-full"
        />
      )}
      {roadmap.tasks.length > 1 && (
        <Select
          label={`Dependency of ${name}`}
          value={task.dependsOn}
          options={dependencyOptions}
          onChange={(dependsOn) => edit({ dependsOn })}
          className="w-full"
        />
      )}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={column === 0}
          aria-label={`Move ${name} to ${COLUMN_LABELS[TASK_STATUSES[column - 1]] ?? ""}`}
          onClick={() => edit({ status: TASK_STATUSES[column - 1] })}
        >
          ←
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={column === TASK_STATUSES.length - 1}
          aria-label={`Move ${name} to ${COLUMN_LABELS[TASK_STATUSES[column + 1]] ?? ""}`}
          onClick={() => edit({ status: TASK_STATUSES[column + 1] })}
        >
          →
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto !text-danger"
          aria-label={`Delete ${name}`}
          onClick={() =>
            save((r) => ({
              ...r,
              tasks: removeItem(r.tasks, task.id).map((t) =>
                t.dependsOn === task.id ? { ...t, dependsOn: "" } : t,
              ),
            }))
          }
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

export default function RoadmapPage() {
  const { project, save } = useProjectSlice("roadmap");
  const [title, setTitle] = useState("");
  const [milestone, setMilestone] = useState({ title: "", date: "" });
  if (!project) return null;
  const { roadmap } = project;
  const progress = roadmapProgress(roadmap);
  const room = MAX_TASKS - roadmap.tasks.length;
  const existing = new Set(roadmap.tasks.map((t) => t.title.trim().toLowerCase()));
  const latestReview = project.feedback.find((entry) => entry.kind === "review");
  const coachSteps =
    latestReview?.kind === "review"
      ? latestReview.review.nextSteps.filter((s) => !existing.has(s.slice(0, 160).toLowerCase()))
      : [];
  const suggestions = suggestTasks(project);

  const addTasks = (titles: string[], source: Task["source"]) =>
    save((r) => ({
      ...r,
      tasks: [
        ...r.tasks,
        ...titles.slice(0, MAX_TASKS - r.tasks.length).map((t) => newTask(t, source)),
      ],
    }));

  function handleTask(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    addTasks([title.trim()], "user");
    setTitle("");
  }

  function handleMilestone(event: FormEvent) {
    event.preventDefault();
    if (!milestone.title.trim()) return;
    save((r) => ({
      ...r,
      milestones: [
        ...r.milestones,
        { id: newId(), title: milestone.title.trim(), date: milestone.date },
      ],
    }));
    setMilestone({ title: "", date: "" });
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="MVP Roadmap">
        Plan the smallest version worth testing. Score tasks by impact and effort, group them into
        milestones, and move them across the board as you work.
      </ToolHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Add tasks"
          description="Suggested steps are generic templates phrased for your idea. Edit or delete any of them."
          actions={
            <>
              <Button
                size="sm"
                disabled={room === 0 || suggestions.length === 0}
                onClick={() => addTasks(suggestions, "suggested")}
              >
                Suggest MVP steps
              </Button>
              <Button
                size="sm"
                disabled={room === 0 || coachSteps.length === 0}
                onClick={() => addTasks(coachSteps, "suggested")}
              >
                Import coach next steps
              </Button>
            </>
          }
        >
          <form onSubmit={handleTask} className="flex gap-2">
            <input
              aria-label="New task"
              placeholder="e.g. Build the sign-up page"
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
            <Button type="submit" variant="primary" disabled={room === 0 || !title.trim()}>
              Add task
            </Button>
          </form>
        </Panel>
        <Panel
          title="Milestones"
          description={`Overall: ${progress.done} of ${progress.total} tasks done.`}
        >
          <ProgressBar percent={progress.percent} label="Roadmap progress" />
          <form onSubmit={handleMilestone} className="flex flex-wrap gap-2">
            <input
              aria-label="New milestone"
              placeholder="e.g. First 10 testers"
              value={milestone.title}
              maxLength={80}
              onChange={(e) => setMilestone({ ...milestone, title: e.target.value })}
              className={`${inputClass} min-w-0 flex-1 basis-40`}
            />
            <input
              aria-label="Milestone target date"
              type="date"
              value={milestone.date}
              onChange={(e) => setMilestone({ ...milestone, date: e.target.value })}
              className={`${inputBase}`}
            />
            <Button
              type="submit"
              disabled={roadmap.milestones.length >= MAX_MILESTONES || !milestone.title.trim()}
            >
              Add
            </Button>
          </form>
          <ul className="flex flex-col gap-2">
            {roadmap.milestones.map((m) => {
              const p = roadmapProgress(roadmap, m.id);
              return (
                <li key={m.id} className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    {m.date && <span className="text-xs text-muted">by {m.date}</span>}
                    <span className="ml-auto text-xs text-muted">
                      {p.done}/{p.total}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete milestone ${m.title}`}
                      onClick={() =>
                        save((r) => ({
                          ...r,
                          milestones: removeItem(r.milestones, m.id),
                          tasks: r.tasks.map((t) =>
                            t.milestoneId === m.id ? { ...t, milestoneId: "" } : t,
                          ),
                        }))
                      }
                    >
                      ✕
                    </Button>
                  </div>
                  <ProgressBar percent={p.percent} label={`${m.title} progress`} />
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const tasks = sortByPriority(roadmap.tasks.filter((t) => t.status === status));
          return (
            <section
              key={status}
              aria-labelledby={`column-${status}`}
              className="flex flex-col gap-3 rounded-2xl bg-raised p-3"
            >
              <h3
                id={`column-${status}`}
                className="flex items-center justify-between px-1 text-sm font-semibold"
              >
                {COLUMN_LABELS[status]}
                <span className="font-normal text-muted">{tasks.length}</span>
              </h3>
              <ul className="flex flex-col gap-2">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} roadmap={roadmap} save={save} />
                ))}
              </ul>
              {tasks.length === 0 && <p className="px-1 text-xs text-muted">Nothing here.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
