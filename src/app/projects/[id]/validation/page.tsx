"use client";

import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Panel,
  Select,
  SourceBadge,
  StatusMessage,
  ToolHeader,
  inputBase,
  inputClass,
  toOptions,
} from "@/components/ui";
import { useProjectSlice } from "@/components/use-current-project";
import { appendText, patchItem, removeItem, shorten } from "@/lib/list";
import {
  EVIDENCE_DIRECTIONS,
  EVIDENCE_KINDS,
  EXPERIMENT_STATUSES,
  HYPOTHESIS_STATUSES,
  PRIORITIES,
  SURVEY_TYPES,
  type Validation,
} from "@/lib/schema";
import { newId, updateProject } from "@/lib/store";
import {
  INTERVIEW_QUESTION_BANK,
  evidenceSummaryText,
  evidenceTally,
  suggestHypotheses,
  summarizeSurvey,
  validationNextSteps,
} from "@/lib/validation";

type Save = (change: (value: Validation) => Validation) => void;
type PanelProps = { validation: Validation; save: Save };
type EvidenceDraft = Omit<Validation["evidence"][number], "id">;
const EMPTY_EVIDENCE: EvidenceDraft = {
  text: "",
  kind: "interview",
  direction: "supports",
  hypothesisId: "",
};

const LIMITS = {
  hypotheses: 30,
  interviewQuestions: 30,
  interviews: 50,
  surveyQuestions: 12,
  surveyResponses: 200,
  evidence: 100,
  experiments: 30,
};
const CONFIDENCE = ["1", "2", "3", "4", "5"].map((value) => ({
  value,
  label: `Confidence ${value}/5`,
}));
const PRIORITY_OPTIONS = toOptions(PRIORITIES, {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
});
const SURVEY_TYPE_OPTIONS = toOptions(SURVEY_TYPES, {
  scale: "1–5 scale",
  yesno: "Yes / No",
  text: "Short text",
});
const DIRECTION_TONE = { supports: "accent", contradicts: "warn", neutral: "neutral" } as const;

function hypothesisOptions(validation: Validation) {
  return [
    { value: "", label: "Not linked to a hypothesis" },
    ...validation.hypotheses.map((h, i) => ({
      value: h.id,
      label: `H${i + 1}: ${shorten(h.statement, 50) || "(empty)"}`,
    })),
  ];
}

function HypothesesPanel({
  validation,
  save,
  onImport,
  canImport,
}: PanelProps & { onImport: () => void; canImport: boolean }) {
  const full = validation.hypotheses.length >= LIMITS.hypotheses;
  const edit = (id: string, patch: Partial<Validation["hypotheses"][number]>) =>
    save((v) => ({ ...v, hypotheses: patchItem(v.hypotheses, id, patch) }));
  const remove = (id: string) =>
    save((v) => ({
      ...v,
      hypotheses: removeItem(v.hypotheses, id),
      evidence: v.evidence.map((e) => (e.hypothesisId === id ? { ...e, hypothesisId: "" } : e)),
      experiments: v.experiments.map((e) =>
        e.hypothesisId === id ? { ...e, hypothesisId: "" } : e,
      ),
    }));
  const add = () =>
    save((v) => ({
      ...v,
      hypotheses: [
        ...v.hypotheses,
        {
          id: newId(),
          statement: "",
          source: "user",
          priority: "medium",
          confidence: 3,
          status: "untested",
        },
      ],
    }));

  return (
    <Panel
      title="Hypotheses"
      description="What must be true for this idea to work. Test high-priority, low-confidence ones first. Status changes only when you change it."
      actions={
        <>
          <Button size="sm" onClick={onImport} disabled={!canImport || full}>
            Import from idea
          </Button>
          <Button size="sm" variant="primary" onClick={add} disabled={full}>
            Add hypothesis
          </Button>
        </>
      }
    >
      {validation.hypotheses.length === 0 ? (
        <p className="text-sm text-muted">
          No hypotheses yet. Import the assumptions you wrote in Idea Studio, or add your own.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {validation.hypotheses.map((h, i) => {
            const tally = evidenceTally(validation, h.id);
            const name = `hypothesis ${i + 1}`;
            return (
              <li key={h.id} className="rounded-xl border border-line p-3">
                <textarea
                  aria-label={`Hypothesis ${i + 1}`}
                  value={h.statement}
                  rows={2}
                  maxLength={300}
                  onChange={(event) => edit(h.id, { statement: event.target.value })}
                  className={`${inputClass} resize-y`}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SourceBadge source={h.source} />
                  <Select
                    label={`Priority of ${name}`}
                    value={h.priority}
                    options={PRIORITY_OPTIONS}
                    onChange={(priority) => edit(h.id, { priority })}
                  />
                  <Select
                    label={`Confidence in ${name}`}
                    value={String(h.confidence)}
                    options={CONFIDENCE}
                    onChange={(value) => edit(h.id, { confidence: Number(value) })}
                  />
                  <Select
                    label={`Status of ${name}`}
                    value={h.status}
                    options={toOptions(HYPOTHESIS_STATUSES)}
                    onChange={(status) => edit(h.id, { status })}
                  />
                  <span className="text-xs text-muted">
                    Evidence: {tally.supports} for · {tally.contradicts} against
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto !text-danger"
                    aria-label={`Remove ${name}`}
                    onClick={() => remove(h.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function InterviewQuestionsPanel({ validation, save }: PanelProps) {
  const [draft, setDraft] = useState("");
  const full = validation.interviewQuestions.length >= LIMITS.interviewQuestions;
  const used = new Set(validation.interviewQuestions.map((q) => q.text));
  const add = (text: string) =>
    save((v) => ({
      ...v,
      interviewQuestions: [...v.interviewQuestions, { id: newId(), text: text.slice(0, 300) }],
    }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    add(draft.trim());
    setDraft("");
  }

  return (
    <Panel
      title="Interview guide"
      description="Ask about what people did in the past, not what they might do. Pick from the bank or write your own."
    >
      <div className="flex flex-wrap gap-2">
        {INTERVIEW_QUESTION_BANK.filter((q) => !used.has(q)).map((q) => (
          <Button
            key={q}
            size="sm"
            variant="ghost"
            className="!h-auto border border-dashed border-line py-1 text-left"
            disabled={full}
            onClick={() => add(q)}
          >
            + {q}
          </Button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          aria-label="New interview question"
          value={draft}
          maxLength={300}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write your own question"
          className={inputClass}
        />
        <Button type="submit" disabled={full || !draft.trim()}>
          Add
        </Button>
      </form>
      {validation.interviewQuestions.length > 0 && (
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm marker:text-muted">
          {validation.interviewQuestions.map((q, i) => (
            <li key={q.id}>
              <div className="flex gap-2">
                <input
                  aria-label={`Interview question ${i + 1}`}
                  value={q.text}
                  maxLength={300}
                  onChange={(e) =>
                    save((v) => ({
                      ...v,
                      interviewQuestions: patchItem(v.interviewQuestions, q.id, {
                        text: e.target.value,
                      }),
                    }))
                  }
                  className={inputClass}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove interview question ${i + 1}`}
                  onClick={() =>
                    save((v) => ({
                      ...v,
                      interviewQuestions: removeItem(v.interviewQuestions, q.id),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function InterviewsPanel({ validation, save }: PanelProps) {
  const [form, setForm] = useState({ who: "", date: "", notes: "" });
  const full = validation.interviews.length >= LIMITS.interviews;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.who.trim() || !form.notes.trim()) return;
    save((v) => ({
      ...v,
      interviews: [{ id: newId(), ...form, who: form.who.trim() }, ...v.interviews],
    }));
    setForm({ who: "", date: "", notes: "" });
  }

  return (
    <Panel
      title="Interview notes"
      description="Record conversations you actually had. Describe people by role, not by full name."
    >
      <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[1fr_10rem]">
        <input
          aria-label="Who you interviewed"
          placeholder="Who (e.g. junior, chemistry student)"
          value={form.who}
          maxLength={120}
          onChange={(e) => setForm({ ...form, who: e.target.value })}
          className={inputClass}
        />
        <input
          aria-label="Interview date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className={inputClass}
        />
        <textarea
          aria-label="Interview notes"
          placeholder="What they said, in their own words where you can"
          rows={3}
          value={form.notes}
          maxLength={2000}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className={`${inputClass} resize-y sm:col-span-2`}
        />
        <Button
          type="submit"
          disabled={full || !form.who.trim() || !form.notes.trim()}
          className="sm:col-span-2 sm:justify-self-start"
        >
          Save interview
        </Button>
      </form>
      {validation.interviews.length === 0 ? (
        <p className="text-sm text-muted">No interviews recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {validation.interviews.map((interview, i) => (
            <li key={interview.id}>
              <details className="rounded-xl border border-line">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="font-medium">{interview.who}</span>
                  {interview.date && <span className="text-muted">{interview.date}</span>}
                </summary>
                <div className="flex flex-col gap-2 border-t border-line p-3">
                  <textarea
                    aria-label={`Notes from interview ${i + 1}`}
                    value={interview.notes}
                    rows={4}
                    maxLength={2000}
                    onChange={(e) =>
                      save((v) => ({
                        ...v,
                        interviews: patchItem(v.interviews, interview.id, {
                          notes: e.target.value,
                        }),
                      }))
                    }
                    className={`${inputClass} resize-y`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="self-start !text-danger"
                    onClick={() =>
                      save((v) => ({ ...v, interviews: removeItem(v.interviews, interview.id) }))
                    }
                  >
                    Delete interview
                  </Button>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SurveyPanel({ validation, save }: PanelProps) {
  const [question, setQuestion] = useState({
    text: "",
    type: "scale" as Validation["surveyQuestions"][number]["type"],
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions = validation.surveyQuestions;
  const summaries = summarizeSurvey(validation);

  function addQuestion(event: FormEvent) {
    event.preventDefault();
    if (!question.text.trim()) return;
    save((v) => ({
      ...v,
      surveyQuestions: [
        ...v.surveyQuestions,
        { id: newId(), text: question.text.trim(), type: question.type },
      ],
    }));
    setQuestion({ ...question, text: "" });
  }

  function saveResponse(event: FormEvent) {
    event.preventDefault();
    const filled = Object.fromEntries(Object.entries(answers).filter(([, value]) => value.trim()));
    if (Object.keys(filled).length === 0) return;
    save((v) => ({
      ...v,
      surveyResponses: [...v.surveyResponses, { id: newId(), answers: filled }],
    }));
    setAnswers({});
  }

  return (
    <Panel
      title="Survey"
      description="Build a short survey, then type in each response you collect. Summaries use only the responses you enter."
    >
      <form onSubmit={addQuestion} className="flex flex-wrap gap-2">
        <input
          aria-label="New survey question"
          placeholder="Survey question"
          value={question.text}
          maxLength={300}
          onChange={(e) => setQuestion({ ...question, text: e.target.value })}
          className={`${inputClass} min-w-0 flex-1 basis-56`}
        />
        <Select
          label="Answer type"
          value={question.type}
          options={SURVEY_TYPE_OPTIONS}
          onChange={(type) => setQuestion({ ...question, type })}
        />
        <Button
          type="submit"
          disabled={questions.length >= LIMITS.surveyQuestions || !question.text.trim()}
        >
          Add question
        </Button>
      </form>

      {questions.length > 0 && (
        <>
          <ol className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <li key={q.id} className="flex flex-wrap gap-2">
                <input
                  aria-label={`Survey question ${i + 1}`}
                  value={q.text}
                  maxLength={300}
                  onChange={(e) =>
                    save((v) => ({
                      ...v,
                      surveyQuestions: patchItem(v.surveyQuestions, q.id, { text: e.target.value }),
                    }))
                  }
                  className={`${inputClass} min-w-0 flex-1 basis-56`}
                />
                <Badge>{SURVEY_TYPE_OPTIONS.find((o) => o.value === q.type)?.label}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove survey question ${i + 1}`}
                  onClick={() =>
                    save((v) => ({ ...v, surveyQuestions: removeItem(v.surveyQuestions, q.id) }))
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ol>

          <form onSubmit={saveResponse} className="flex flex-col gap-3 rounded-xl bg-raised p-4">
            <p className="text-sm font-medium">Enter one response</p>
            {questions.map((q) => {
              const value = answers[q.id] ?? "";
              const set = (next: string) => setAnswers({ ...answers, [q.id]: next });
              const label = `Answer to: ${q.text || "untitled question"}`;
              return (
                <label key={q.id} className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">{q.text || "Untitled question"}</span>
                  {q.type === "text" ? (
                    <input
                      aria-label={label}
                      value={value}
                      maxLength={500}
                      onChange={(e) => set(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <select
                      aria-label={label}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className={`${inputBase} self-start`}
                    >
                      <option value="">No answer</option>
                      {(q.type === "scale" ? ["1", "2", "3", "4", "5"] : ["yes", "no"]).map(
                        (option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ),
                      )}
                    </select>
                  )}
                </label>
              );
            })}
            <Button
              type="submit"
              className="self-start"
              disabled={validation.surveyResponses.length >= LIMITS.surveyResponses}
            >
              Save response
            </Button>
          </form>

          <div>
            <p className="text-sm font-medium">
              Results: {validation.surveyResponses.length}{" "}
              {validation.surveyResponses.length === 1 ? "response" : "responses"} recorded
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {summaries.map((summary) => (
                <li key={summary.id} className="rounded-lg border border-line p-3">
                  <p className="font-medium">{summary.text || "Untitled question"}</p>
                  <p className="text-muted">
                    {summary.count === 0
                      ? "No answers yet."
                      : summary.average !== undefined
                        ? `Average ${summary.average.toFixed(1)} out of 5 from ${summary.count} answers.`
                        : summary.yesPercent !== undefined
                          ? `${summary.yesPercent}% answered yes (${summary.count} answers).`
                          : `${summary.count} written answers.`}
                  </p>
                  {summary.answers && (
                    <ul className="mt-1 list-disc pl-5 text-muted">
                      {summary.answers.slice(0, 10).map((answer, i) => (
                        <li key={i}>{answer}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {validation.surveyResponses.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() =>
                  save((v) => ({ ...v, surveyResponses: v.surveyResponses.slice(0, -1) }))
                }
              >
                Remove the last response
              </Button>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

function EvidencePanel({ validation, save }: PanelProps) {
  const [form, setForm] = useState<EvidenceDraft>(EMPTY_EVIDENCE);
  const full = validation.evidence.length >= LIMITS.evidence;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.text.trim()) return;
    save((v) => ({
      ...v,
      evidence: [{ id: newId(), ...form, text: form.text.trim() }, ...v.evidence],
    }));
    setForm({ ...form, text: "" });
  }

  return (
    <Panel
      title="Evidence board"
      description="Only what you observed or were told. Evidence against your idea is as valuable as evidence for it."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          aria-label="Evidence"
          placeholder="e.g. 4 of 6 juniors I interviewed missed office hours before the last test"
          rows={2}
          value={form.text}
          maxLength={500}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          className={`${inputClass} resize-y`}
        />
        <div className="flex flex-wrap gap-2">
          <Select
            label="Evidence source"
            value={form.kind}
            options={toOptions(EVIDENCE_KINDS)}
            onChange={(kind) => setForm({ ...form, kind })}
          />
          <Select
            label="Evidence direction"
            value={form.direction}
            options={toOptions(EVIDENCE_DIRECTIONS)}
            onChange={(direction) => setForm({ ...form, direction })}
          />
          <Select
            label="Linked hypothesis"
            value={form.hypothesisId}
            options={hypothesisOptions(validation)}
            onChange={(hypothesisId) => setForm({ ...form, hypothesisId })}
            className="min-w-0 max-w-full"
          />
          <Button type="submit" variant="primary" disabled={full || !form.text.trim()}>
            Add evidence
          </Button>
        </div>
      </form>
      <div className="grid gap-3 md:grid-cols-3">
        {EVIDENCE_DIRECTIONS.map((direction) => {
          const items = validation.evidence.filter((e) => e.direction === direction);
          return (
            <section
              key={direction}
              aria-label={`Evidence that ${direction === "neutral" ? "is neutral" : direction}`}
              className="rounded-xl bg-raised p-3"
            >
              <h4 className="text-sm font-semibold capitalize">
                {direction} <span className="font-normal text-muted">({items.length})</span>
              </h4>
              <ul className="mt-2 flex flex-col gap-2">
                {items.map((item) => {
                  const index = validation.hypotheses.findIndex((h) => h.id === item.hypothesisId);
                  return (
                    <li key={item.id} className="rounded-lg bg-surface p-3 text-sm">
                      <p>{item.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone={DIRECTION_TONE[direction]}>{item.kind}</Badge>
                        {index >= 0 && <Badge>H{index + 1}</Badge>}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          aria-label={`Delete evidence: ${shorten(item.text, 40)}`}
                          onClick={() =>
                            save((v) => ({ ...v, evidence: removeItem(v.evidence, item.id) }))
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}

function ExperimentsPanel({ validation, save }: PanelProps) {
  const [title, setTitle] = useState("");
  const edit = (id: string, patch: Partial<Validation["experiments"][number]>) =>
    save((v) => ({ ...v, experiments: patchItem(v.experiments, id, patch) }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    save((v) => ({
      ...v,
      experiments: [
        ...v.experiments,
        {
          id: newId(),
          title: title.trim(),
          hypothesisId: "",
          method: "",
          metric: "",
          status: "planned",
          result: "",
        },
      ],
    }));
    setTitle("");
  }

  return (
    <Panel
      title="Experiments"
      description="Small tests you plan, run, and record. Decide what result would change your mind before you start."
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          aria-label="New experiment"
          placeholder="e.g. Paper sign-up sheet in the library"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <Button
          type="submit"
          disabled={validation.experiments.length >= LIMITS.experiments || !title.trim()}
        >
          Add
        </Button>
      </form>
      {validation.experiments.map((experiment, i) => {
        const name = `experiment ${i + 1}`;
        return (
          <article
            key={experiment.id}
            className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2"
          >
            <input
              aria-label={`Title of ${name}`}
              value={experiment.title}
              maxLength={120}
              onChange={(e) => edit(experiment.id, { title: e.target.value })}
              className={`${inputClass} font-medium sm:col-span-2`}
            />
            <Select
              label={`Hypothesis tested by ${name}`}
              value={experiment.hypothesisId}
              options={hypothesisOptions(validation)}
              onChange={(hypothesisId) => edit(experiment.id, { hypothesisId })}
              className="min-w-0 max-w-full"
            />
            <Select
              label={`Status of ${name}`}
              value={experiment.status}
              options={toOptions(EXPERIMENT_STATUSES)}
              onChange={(status) => edit(experiment.id, { status })}
            />
            <input
              aria-label={`Method of ${name}`}
              placeholder="How you will run it"
              value={experiment.method}
              maxLength={500}
              onChange={(e) => edit(experiment.id, { method: e.target.value })}
              className={inputClass}
            />
            <input
              aria-label={`Success measure of ${name}`}
              placeholder="What you will measure, and the target"
              value={experiment.metric}
              maxLength={300}
              onChange={(e) => edit(experiment.id, { metric: e.target.value })}
              className={inputClass}
            />
            <textarea
              aria-label={`Result of ${name}`}
              placeholder="What actually happened (fill in after running it)"
              rows={2}
              value={experiment.result}
              maxLength={500}
              onChange={(e) => edit(experiment.id, { result: e.target.value })}
              className={`${inputClass} resize-y sm:col-span-2`}
            />
            <Button
              size="sm"
              variant="ghost"
              className="justify-self-start !text-danger"
              onClick={() =>
                save((v) => ({ ...v, experiments: removeItem(v.experiments, experiment.id) }))
              }
            >
              Delete {name}
            </Button>
          </article>
        );
      })}
    </Panel>
  );
}

export default function ValidationPage() {
  const { project, save } = useProjectSlice("validation");
  const [message, setMessage] = useState<string>();
  if (!project) return null;
  const { validation } = project;
  const drafts = suggestHypotheses(project);
  const steps = validationNextSteps(validation);

  const importHypotheses = () =>
    save((v) => ({
      ...v,
      hypotheses: [
        ...v.hypotheses,
        ...drafts.slice(0, LIMITS.hypotheses - v.hypotheses.length).map((draft) => ({
          ...draft,
          id: newId(),
          priority: "medium" as const,
          confidence: 3,
          status: "untested" as const,
        })),
      ],
    }));

  function addToPitch() {
    if (!project?.slides.some((slide) => slide.kind === "validation")) {
      setMessage("Generate a pitch first, then add your evidence to it.");
      return;
    }
    const ok = updateProject(project.id, (p) => ({
      ...p,
      slides: p.slides.map((slide) =>
        slide.kind === "validation"
          ? { ...slide, body: appendText(slide.body, evidenceSummaryText(p.validation)) }
          : slide,
      ),
    }));
    setMessage(
      ok
        ? "Added to the “What we still need to prove” slide in your pitch."
        : "That slide is full. Shorten it in the Pitch Builder first.",
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Validation Lab">
        Turn assumptions into tested facts. Your assumptions, suggested drafts, and recorded
        evidence are labelled separately. Nothing here is filled in for you.
      </ToolHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <HypothesesPanel
          validation={validation}
          save={save}
          onImport={importHypotheses}
          canImport={drafts.length > 0}
        />
        <Panel
          title="Next steps"
          description="A rule-based checklist from what you have recorded. Not AI."
          actions={
            <Button size="sm" onClick={addToPitch}>
              Add evidence to pitch
            </Button>
          }
        >
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted marker:font-semibold marker:text-accent">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {message && <StatusMessage>{message}</StatusMessage>}
        </Panel>
      </div>
      <EvidencePanel validation={validation} save={save} />
      <div className="grid gap-6 lg:grid-cols-2">
        <InterviewQuestionsPanel validation={validation} save={save} />
        <InterviewsPanel validation={validation} save={save} />
      </div>
      <SurveyPanel validation={validation} save={save} />
      <ExperimentsPanel validation={validation} save={save} />
    </div>
  );
}
