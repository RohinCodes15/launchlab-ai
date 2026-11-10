"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { useCurrentProject } from "@/components/use-current-project";
import {
  IDEA_FIELDS,
  NAME_MAX,
  STATUSES,
  STATUS_LABELS,
  SUMMARY_MAX,
  TEXT_MAX,
  projectSchema,
  type Status,
} from "@/lib/schema";
import { updateProject } from "@/lib/store";

export default function IdeaStudioPage() {
  const { project } = useCurrentProject();
  // The name is edited locally so an invalid (empty) name is shown but never saved.
  const [nameDraft, setNameDraft] = useState<string>();
  if (!project) return null;

  const id = project.id;
  const name = nameDraft ?? project.name;
  const nameResult = projectSchema.shape.name.safeParse(name);

  function handleNameChange(value: string) {
    setNameDraft(value);
    const parsed = projectSchema.shape.name.safeParse(value);
    if (parsed.success) updateProject(id, (p) => ({ ...p, name: parsed.data }));
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
      <form className="flex flex-col gap-6" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-6 sm:grid-cols-[1fr_12rem]">
          <Field
            label="Project name"
            error={nameResult.success ? undefined : nameResult.error.issues[0].message}
          >
            {({ id: fieldId, describedBy }) => (
              <input
                id={fieldId}
                value={name}
                maxLength={NAME_MAX}
                aria-invalid={!nameResult.success}
                aria-describedby={describedBy}
                onChange={(event) => handleNameChange(event.target.value)}
                onBlur={() => setNameDraft(undefined)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Status">
            {({ id: fieldId }) => (
              <select
                id={fieldId}
                value={project.status}
                onChange={(event) =>
                  updateProject(id, (p) => ({ ...p, status: event.target.value as Status }))
                }
                className={inputClass}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="One-line summary">
          {({ id: fieldId }) => (
            <input
              id={fieldId}
              value={project.summary}
              maxLength={SUMMARY_MAX}
              onChange={(event) =>
                updateProject(id, (p) => ({ ...p, summary: event.target.value }))
              }
              className={inputClass}
            />
          )}
        </Field>

        {IDEA_FIELDS.map((field) => {
          const value = project.idea[field.key];
          return (
            <Field
              key={field.key}
              label={field.label}
              hint={field.hint}
              aside={
                <span className="text-xs tabular-nums text-muted">
                  {value.length}/{TEXT_MAX}
                </span>
              }
            >
              {({ id: fieldId, describedBy }) => (
                <textarea
                  id={fieldId}
                  value={value}
                  rows={4}
                  maxLength={TEXT_MAX}
                  aria-describedby={describedBy}
                  onChange={(event) =>
                    updateProject(id, (p) => ({
                      ...p,
                      idea: { ...p.idea, [field.key]: event.target.value },
                    }))
                  }
                  className={`${inputClass} resize-y`}
                />
              )}
            </Field>
          );
        })}
      </form>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
          <p role="status" className="flex items-center gap-2 font-medium text-ok">
            <span aria-hidden className="size-2 rounded-full bg-ok" />
            Saved in this browser
          </p>
          <p className="mt-1 text-muted">
            Last change{" "}
            {new Date(project.updatedAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
            . Every edit is saved as you type.
          </p>
        </div>
        <div className="rounded-2xl bg-raised p-5 text-sm">
          <p className="font-medium">Ready for a second opinion?</p>
          <p className="mt-1 text-muted">
            The coach reads what you wrote here and points out gaps, risks, and experiments.
          </p>
          <Link href={`/projects/${id}/coach`} className={`${buttonClass("primary")} mt-4 w-full`}>
            Get coach feedback
          </Link>
        </div>
      </aside>
    </div>
  );
}
