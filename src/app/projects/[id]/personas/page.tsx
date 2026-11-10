"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  Select,
  SourceBadge,
  StatusMessage,
  ToolHeader,
  inputClass,
} from "@/components/ui";
import { useProjectSlice } from "@/components/use-current-project";
import { appendText, patchItem, removeItem } from "@/lib/list";
import { draftPersona, personaSegmentText } from "@/lib/planning";
import { MAX_PERSONAS, PERSONA_FIELDS, type Persona } from "@/lib/schema";
import { newId, updateProject } from "@/lib/store";

const BASIS_OPTIONS = [
  { value: "assumption" as const, label: "Assumption: not yet checked" },
  { value: "evidence" as const, label: "Backed by interviews or evidence" },
];

const blankPersona = (count: number): Omit<Persona, "id"> => ({
  name: `Persona ${count + 1}`,
  source: "user",
  basis: "assumption",
  who: "",
  goals: "",
  pains: "",
  needs: "",
  behaviors: "",
  motivations: "",
});

export default function PersonasPage() {
  const { project, save } = useProjectSlice("personas");
  const [message, setMessage] = useState<string>();
  if (!project) return null;
  const { personas } = project;
  const full = personas.length >= MAX_PERSONAS;
  const add = (persona: Omit<Persona, "id">) =>
    save((list) => [...list, { ...persona, id: newId() }]);
  const edit = (id: string, patch: Partial<Persona>) => save((list) => patchItem(list, id, patch));

  function addToCanvas(persona: Persona) {
    const ok = updateProject(project!.id, (p) => ({
      ...p,
      canvas: {
        ...p.canvas,
        customerSegments: appendText(p.canvas.customerSegments, personaSegmentText(persona)),
      },
    }));
    setMessage(
      ok
        ? `Added ${persona.name} to Customer Segments in the canvas.`
        : "Customer Segments is full. Shorten it first.",
    );
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => add(draftPersona(project))} disabled={full}>
        Draft from my idea
      </Button>
      <Button variant="primary" onClick={() => add(blankPersona(personas.length))} disabled={full}>
        Add persona
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ToolHeader title="Customer Personas">
          Describe the specific people you are building for. Drafts copy what you wrote in Idea
          Studio and mark everything else as unknown. Label each persona as an assumption until
          interviews back it up.
        </ToolHeader>
        {personas.length > 0 && actions}
      </div>

      {personas.length === 0 ? (
        <EmptyState title="No personas yet." actions={actions}>
          Start from your idea, or write one from scratch. One sharp persona beats five vague ones.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {personas.map((persona, index) => (
            <article
              key={persona.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Name of persona ${index + 1}`}
                  value={persona.name}
                  maxLength={60}
                  onChange={(e) => edit(persona.id, { name: e.target.value })}
                  className={`${inputClass} font-display text-xl`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={persona.source} />
                <Badge tone={persona.basis === "evidence" ? "accent" : "warn"}>
                  {persona.basis === "evidence" ? "Evidence-based" : "Assumption"}
                </Badge>
                <Select
                  label={`Basis of ${persona.name}`}
                  value={persona.basis}
                  options={BASIS_OPTIONS}
                  onChange={(basis) => edit(persona.id, { basis })}
                />
              </div>
              {PERSONA_FIELDS.map((field) => {
                const id = `${persona.id}-${field.key}`;
                return (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label htmlFor={id} className="text-xs font-medium text-muted">
                      {field.label}
                    </label>
                    <textarea
                      id={id}
                      rows={2}
                      maxLength={600}
                      value={persona[field.key]}
                      onChange={(e) => edit(persona.id, { [field.key]: e.target.value })}
                      className={`${inputClass} resize-y`}
                    />
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <Button size="sm" onClick={() => addToCanvas(persona)}>
                  Add to canvas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto !text-danger"
                  aria-label={`Delete ${persona.name}`}
                  onClick={() => save((list) => removeItem(list, persona.id))}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {message && <StatusMessage>{message}</StatusMessage>}

      {personas.length >= 2 && (
        <Panel
          title="Compare personas"
          description="Side by side, to see who feels the problem most and who to build for first."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className="w-36 p-2 font-medium text-muted">
                    <span className="sr-only">Field</span>
                  </th>
                  {personas.map((p) => (
                    <th key={p.id} scope="col" className="p-2 font-semibold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <th scope="row" className="p-2 align-top font-normal text-muted">
                    Basis
                  </th>
                  {personas.map((p) => (
                    <td key={p.id} className="p-2 align-top">
                      {p.basis === "evidence" ? "Evidence" : "Assumption"}
                    </td>
                  ))}
                </tr>
                {PERSONA_FIELDS.map((field) => (
                  <tr key={field.key} className="border-t border-line">
                    <th scope="row" className="p-2 align-top font-normal text-muted">
                      {field.label}
                    </th>
                    {personas.map((p) => (
                      <td key={p.id} className="whitespace-pre-wrap p-2 align-top">
                        {p[field.key] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
