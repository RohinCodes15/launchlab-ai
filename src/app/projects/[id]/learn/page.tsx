"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, ProgressBar, ToolHeader, buttonClass } from "@/components/ui";
import { useProjectSlice } from "@/components/use-current-project";
import { LESSONS, learningProgress, type Lesson } from "@/lib/lessons";

function Quiz({ lesson, onPassed }: { lesson: Lesson; onPassed: () => void }) {
  const [choices, setChoices] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const allAnswered = lesson.quiz.every((_, i) => choices[i] !== undefined);
  const allCorrect = lesson.quiz.every((q, i) => choices[i] === q.answer);

  return (
    <section
      aria-labelledby="quiz-heading"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
    >
      <h3 id="quiz-heading" className="font-semibold">
        Check your understanding
      </h3>
      {lesson.quiz.map((q, qi) => {
        const choice = choices[qi];
        return (
          <fieldset key={q.question} className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">
              {qi + 1}. {q.question}
            </legend>
            {q.options.map((option, oi) => (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition-colors ${choice === oi ? "border-accent bg-accent-soft" : "border-line hover:bg-raised"}`}
              >
                <input
                  type="radio"
                  name={`${lesson.id}-q${qi}`}
                  checked={choice === oi}
                  onChange={() => {
                    setChoices({ ...choices, [qi]: oi });
                    setChecked(false);
                  }}
                  className="mt-0.5 accent-accent"
                />
                {option}
              </label>
            ))}
            {checked && choice !== undefined && (
              <p
                role="status"
                className={`text-sm ${choice === q.answer ? "text-ok" : "text-danger"}`}
              >
                {choice === q.answer ? "Correct. " : "Not quite. "}
                <span className="text-muted">{q.why}</span>
              </p>
            )}
          </fieldset>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setChecked(true)} disabled={!allAnswered}>
          Check answers
        </Button>
        {checked && allCorrect && (
          <Button variant="primary" onClick={onPassed}>
            Mark lesson complete
          </Button>
        )}
      </div>
    </section>
  );
}

export default function LearnPage() {
  const { project, save } = useProjectSlice("learning");
  const [selectedId, setSelectedId] = useState<string>();
  if (!project) return null;
  const completed = new Set(project.learning.completed);
  const progress = learningProgress(project);
  const lesson =
    LESSONS.find((l) => l.id === selectedId) ??
    LESSONS.find((l) => !completed.has(l.id)) ??
    LESSONS[0];
  const lessonIndex = LESSONS.indexOf(lesson);
  const taskDone = lesson.task.isDone(project);
  const taskHref = `/projects/${project.id}${lesson.task.tool ? `/${lesson.task.tool}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Learning Hub">
        Short lessons on the ideas behind each tool. Each one ends with a quiz and a task in your
        own project.
      </ToolHeader>
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Lessons" className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-xs text-muted">
            <ProgressBar percent={progress.percent} label="Lessons completed" />
            <span className="shrink-0">
              {progress.done}/{progress.total}
            </span>
          </div>
          <ol className="flex flex-col gap-1">
            {LESSONS.map((l, i) => (
              <li key={l.id}>
                <button
                  type="button"
                  aria-current={l.id === lesson.id ? "true" : undefined}
                  onClick={() => setSelectedId(l.id)}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${l.id === lesson.id ? "bg-raised font-medium" : "text-muted hover:bg-raised hover:text-fg"}`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] ${completed.has(l.id) ? "bg-accent text-accent-fg" : "border border-line"}`}
                  >
                    {completed.has(l.id) ? "✓" : i + 1}
                  </span>
                  {l.title}
                  {completed.has(l.id) && <span className="sr-only">(completed)</span>}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <article key={lesson.id} className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Lesson {lessonIndex + 1} · {lesson.minutes} min read
            </p>
            <h3 className="mt-2 font-display text-4xl leading-tight">{lesson.title}</h3>
          </div>
          <div className="flex max-w-2xl flex-col gap-3 leading-relaxed">
            {lesson.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-raised p-4 text-sm">
            <span className="font-medium">Try it on {project.name}:</span>
            <span>{lesson.task.label}</span>
            {taskDone ? <Badge tone="accent">Done</Badge> : <Badge>Not done yet</Badge>}
            <Link href={taskHref} className={`${buttonClass("secondary", "sm")} ml-auto`}>
              Open
            </Link>
          </div>

          {completed.has(lesson.id) ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-sm">
              <Badge tone="accent">Lesson complete</Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  save((l) => ({ completed: l.completed.filter((id) => id !== lesson.id) }))
                }
              >
                Mark as not complete
              </Button>
            </div>
          ) : (
            <Quiz
              key={lesson.id}
              lesson={lesson}
              onPassed={() => save((l) => ({ completed: [...l.completed, lesson.id] }))}
            />
          )}
        </article>
      </div>
    </div>
  );
}
