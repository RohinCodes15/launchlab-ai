"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Badge, Button, EmptyState, Field, buttonClass, inputClass } from "@/components/ui";
import { useCurrentProject } from "@/components/use-current-project";
import type { AiStatus } from "@/lib/ai";
import { postCoach, sourceLabel } from "@/lib/coach-client";
import {
  QUESTION_MAX,
  type Answer,
  type FeedbackEntry,
  type Project,
  type Review,
} from "@/lib/schema";
import { updateProject } from "@/lib/store";

const MAX_HISTORY = 100;

async function requestCoach(project: Project, question?: string): Promise<FeedbackEntry> {
  const result = await postCoach({
    name: project.name,
    summary: project.summary,
    idea: project.idea,
    question,
  });
  const meta = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  if (result.kind === "review") return { ...result, ...meta };
  if (result.kind === "answer") return { ...result, ...meta, question: question ?? "" };
  throw new Error("The coach sent a response this app could not read. Try again.");
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-accent">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

const SEVERITY_TONE = { high: "accent", medium: "warn", low: "neutral" } as const;

function ReviewView({ review }: { review: Review }) {
  return (
    <div className="flex flex-col gap-7">
      <p>{review.summary}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl bg-raised p-4">
          <h3 className="flex items-center justify-between font-semibold">
            Problem clarity
            <span
              className="font-display text-2xl text-accent"
              aria-label={`${review.problemClarity.score} out of 5`}
            >
              {review.problemClarity.score}/5
            </span>
          </h3>
          <p className="mt-2 text-sm text-muted">{review.problemClarity.assessment}</p>
        </section>
        <section className="rounded-xl bg-raised p-4">
          <h3 className="font-semibold">Customer segment</h3>
          <p className="mt-2 text-sm text-muted">{review.customerSegment.assessment}</p>
        </section>
      </div>
      <List title="Narrowing your audience" items={review.customerSegment.suggestions} />
      <List title="Competitor research questions" items={review.competitorQuestions} />
      <List title="Differentiation" items={review.differentiation} />
      <List title="Business model ideas to test" items={review.businessModels} />
      <section>
        <h3 className="font-semibold">Risks</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {review.risks.map((item) => (
            <li key={item.risk} className="flex items-start gap-3">
              <span className="w-16 shrink-0">
                <Badge tone={SEVERITY_TONE[item.severity]}>{item.severity}</Badge>
              </span>
              <span className="text-muted">{item.risk}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold">Validation experiments</h3>
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">
          {review.experiments.map((item) => (
            <li key={item.title} className="rounded-xl border border-line p-4 text-sm">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-muted">{item.how}</p>
              <p className="mt-2 text-muted">
                <span className="font-medium text-fg">Measure:</span> {item.measure}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold">Next steps, in priority order</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted marker:font-semibold marker:text-accent">
          {review.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <p className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
        <span className="font-semibold">What the coach does not know: </span>
        {review.uncertainty}
      </p>
    </div>
  );
}

function AnswerView({ question, answer }: { question: string; answer: Answer }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="font-medium">“{question}”</p>
      <p className="whitespace-pre-wrap">{answer.answer}</p>
      <List title="Hypotheses this rests on" items={answer.hypotheses} />
      <List title="Next steps" items={answer.nextSteps} />
    </div>
  );
}

function EntryCard({ entry, open }: { entry: FeedbackEntry; open: boolean }) {
  const title: ReactNode = entry.kind === "review" ? "Idea review" : `Follow-up: ${entry.question}`;
  return (
    <details open={open} className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-5">
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        <span className="text-xs text-muted">
          {new Date(entry.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        <Badge tone={entry.source === "ai" ? "accent" : "neutral"}>{sourceLabel(entry)}</Badge>
      </summary>
      <div className="border-t border-line p-5">
        {entry.notice && (
          <p className="mb-5 rounded-lg bg-warn-soft p-3 text-sm text-warn">{entry.notice}</p>
        )}
        {entry.kind === "review" ? (
          <ReviewView review={entry.review} />
        ) : (
          <AnswerView question={entry.question} answer={entry.answer} />
        )}
      </div>
    </details>
  );
}

export default function CoachPage() {
  const { project } = useCurrentProject();
  const [status, setStatus] = useState<AiStatus>();
  const [pending, setPending] = useState<"review" | "answer">();
  const [error, setError] = useState<string>();
  const [question, setQuestion] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { ai?: AiStatus }) => setStatus(body.ai))
      .catch(() => undefined); // the badge is informational; each answer carries its own source label
    return () => controller.abort();
  }, []);

  if (!project) return null;
  const current = project;
  const hasIdea = Boolean(current.idea.problem.trim() || current.idea.solution.trim());
  const hasReview = current.feedback.some((entry) => entry.kind === "review");

  async function ask(kind: "review" | "answer") {
    setPending(kind);
    setError(undefined);
    try {
      const entry = await requestCoach(current, kind === "answer" ? question.trim() : undefined);
      updateProject(current.id, (p) => ({
        ...p,
        feedback: [entry, ...p.feedback].slice(0, MAX_HISTORY),
      }));
      if (kind === "answer") setQuestion("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setPending(undefined);
    }
  }

  function handleQuestion(event: FormEvent) {
    event.preventDefault();
    if (question.trim().length >= 3) void ask("answer");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-raised p-5">
        <div>
          <h2 className="font-display text-3xl">Startup Coach</h2>
          <p className="mt-1 text-sm text-muted">
            {status?.mode === "ai"
              ? `Connected to an AI model (${status.model}). Your idea text is sent to it for feedback.`
              : "Running the offline coach: fixed rules, no AI model, no data leaves this app."}
          </p>
        </div>
        <Button
          variant="primary"
          disabled={!hasIdea || Boolean(pending)}
          onClick={() => void ask("review")}
        >
          {pending === "review" ? "Reviewing…" : hasReview ? "Review again" : "Get feedback"}
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-surface p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {pending ? "The coach is working." : ""}
      </p>

      {!hasIdea ? (
        <EmptyState
          title="Nothing to review yet."
          actions={
            <Link href={`/projects/${current.id}`} className={buttonClass("primary")}>
              Open Idea Studio
            </Link>
          }
        >
          Write at least a problem statement or a proposed solution, then come back for feedback.
        </EmptyState>
      ) : (
        hasReview && (
          <form onSubmit={handleQuestion} className="rounded-2xl border border-line bg-surface p-5">
            <Field
              label="Ask a follow-up question"
              hint="For example: How should I price this? How do I find people to interview?"
            >
              {({ id, describedBy }) => (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id={id}
                    value={question}
                    maxLength={QUESTION_MAX}
                    aria-describedby={describedBy}
                    onChange={(event) => setQuestion(event.target.value)}
                    className={inputClass}
                  />
                  <Button
                    type="submit"
                    disabled={question.trim().length < 3 || Boolean(pending)}
                    className="shrink-0"
                  >
                    {pending === "answer" ? "Thinking…" : "Ask"}
                  </Button>
                </div>
              )}
            </Field>
          </form>
        )
      )}

      {current.feedback.length > 0 && (
        <section aria-labelledby="history-heading" className="flex flex-col gap-3">
          <h2
            id="history-heading"
            className="text-sm font-medium uppercase tracking-widest text-muted"
          >
            Feedback history
          </h2>
          {current.feedback.map((entry, index) => (
            <EntryCard key={entry.id} entry={entry} open={index === 0} />
          ))}
        </section>
      )}
    </div>
  );
}
