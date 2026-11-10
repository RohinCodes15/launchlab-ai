"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Panel, ToolHeader, inputClass } from "@/components/ui";
import { useProjectSlice } from "@/components/use-current-project";
import type { AiStatus } from "@/lib/ai";
import { postCoach, sourceLabel } from "@/lib/coach-client";
import { removeItem } from "@/lib/list";
import { PRACTICE_CATEGORIES, fillQuestion, practiceStats } from "@/lib/practice";
import { TEXT_MAX, type PracticeSession } from "@/lib/schema";

const MAX_SESSIONS = 100;

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-raised p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-3xl text-accent">
        {value}
        <span className="text-base text-muted">/5</span>
      </p>
    </div>
  );
}

function FeedbackView({ session }: { session: PracticeSession }) {
  const { feedback } = session;
  return (
    <div className="flex flex-col gap-4">
      {session.notice && (
        <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">{session.notice}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <Score label="Clarity" value={feedback.clarity} />
        <Score label="Completeness" value={feedback.completeness} />
      </div>
      <p className="text-sm text-muted">{feedback.summary}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <section>
          <h4 className="text-sm font-semibold">What worked</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted marker:text-accent">
            {feedback.strengths.length ? (
              feedback.strengths.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>Nothing flagged yet. Add more detail.</li>
            )}
          </ul>
        </section>
        <section>
          <h4 className="text-sm font-semibold">To improve</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted marker:text-accent">
            {feedback.improvements.length ? (
              feedback.improvements.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>No issues flagged by the checks.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default function PracticePage() {
  const { project, save } = useProjectSlice("practice");
  const [category, setCategory] = useState(PRACTICE_CATEGORIES[0].key);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<AiStatus>();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((r) => r.json())
      .then((body: { ai?: AiStatus }) => setStatus(body.ai))
      .catch(() => undefined); // informational only; each result carries its own source label
    return () => controller.abort();
  }, []);

  if (!project) return null;
  const current = project;
  const group = PRACTICE_CATEGORIES.find((c) => c.key === category) ?? PRACTICE_CATEGORIES[0];
  const question = fillQuestion(
    group.questions[questionIndex % group.questions.length],
    current.name,
  );
  const stats = practiceStats(current.practice);

  function pickRandom() {
    const nextGroup = PRACTICE_CATEGORIES[Math.floor(Math.random() * PRACTICE_CATEGORIES.length)];
    setCategory(nextGroup.key);
    setQuestionIndex(Math.floor(Math.random() * nextGroup.questions.length));
    setResponse("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!response.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await postCoach({
        name: current.name,
        summary: current.summary,
        idea: current.idea,
        practice: { category: group.key, question, response: response.trim() },
      });
      if (result.kind !== "practice")
        throw new Error("The coach sent a response this app could not read. Try again.");
      const session: PracticeSession = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        source: result.source,
        model: result.model,
        notice: result.notice,
        category: group.key,
        question,
        response: response.trim(),
        feedback: result.practice,
      };
      save((sessions) => [session, ...sessions].slice(0, MAX_SESSIONS));
      setResponse("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  const latest = current.practice[0];

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Pitch Practice">
        Practise answering the questions judges and mentors ask. Write your answer as you would say
        it.{" "}
        {status?.mode === "ai"
          ? `Feedback comes from an AI model (${status.model}); your idea and answer are sent to it.`
          : "Feedback comes from the offline checker: fixed rules, not an AI model."}
      </ToolHeader>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Question category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setQuestionIndex(0);
            }}
            className={`${inputClass} w-auto`}
          >
            {PRACTICE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <Button size="sm" variant="ghost" onClick={() => setQuestionIndex((i) => i + 1)}>
            Next question
          </Button>
          <Button size="sm" variant="ghost" onClick={pickRandom}>
            Surprise me
          </Button>
        </div>
        <p id="practice-question" className="font-display text-2xl leading-snug">
          {question}
        </p>
        <textarea
          aria-labelledby="practice-question"
          value={response}
          rows={6}
          maxLength={TEXT_MAX}
          placeholder="Write your answer. Aim for 40 to 120 words."
          onChange={(e) => setResponse(e.target.value)}
          className={`${inputClass} resize-y`}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted">
            {response.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <Button type="submit" variant="primary" disabled={pending || !response.trim()}>
            {pending ? "Checking…" : "Get feedback"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>

      {latest && (
        <Panel
          title="Latest feedback"
          description={`“${latest.question}”`}
          actions={
            <Badge tone={latest.source === "ai" ? "accent" : "neutral"}>
              {sourceLabel(latest)}
            </Badge>
          }
        >
          <FeedbackView session={latest} />
        </Panel>
      )}

      {stats.count > 0 && (
        <Panel
          title="Your progress"
          description={`${stats.count} answers practised. Averages over your last ${Math.min(stats.count, 10)}.`}
        >
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <Score label="Average clarity" value={stats.clarity ?? 0} />
            <Score label="Average completeness" value={stats.completeness ?? 0} />
          </div>
          {stats.recurring.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold">Advice that keeps coming up</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted marker:text-accent">
                {stats.recurring.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          <h4 className="text-sm font-semibold">History</h4>
          <ul className="flex flex-col gap-2">
            {current.practice.map((session) => (
              <li key={session.id}>
                <details className="rounded-xl border border-line">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                    <span className="min-w-0 flex-1 font-medium">{session.question}</span>
                    <span className="text-xs text-muted">
                      {session.feedback.clarity}/5 clarity · {session.feedback.completeness}/5
                      complete
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line p-3">
                    <p className="text-xs text-muted">
                      {new Date(session.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {sourceLabel(session)}
                    </p>
                    <blockquote className="whitespace-pre-wrap border-l-2 border-line pl-3 text-sm">
                      {session.response}
                    </blockquote>
                    <FeedbackView session={session} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="self-start !text-danger"
                      onClick={() => save((sessions) => removeItem(sessions, session.id))}
                    >
                      Delete this answer
                    </Button>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
