"use client";

import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Confirm,
  Panel,
  StatusMessage,
  ToolHeader,
  inputClass,
} from "@/components/ui";
import { useProjectSlice } from "@/components/use-current-project";
import { appendText, patchItem, removeItem } from "@/lib/list";
import { analyzeCompetitors, positioningTemplate, safeUrl } from "@/lib/planning";
import { MAX_COMPETITORS, MAX_FEATURES, type Competitors } from "@/lib/schema";
import { newId, updateProject } from "@/lib/store";

type Item = Competitors["items"][number];
const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

const TEXT_FIELDS = [
  { key: "notes", label: "What they offer, and where you found it" },
  { key: "strengths", label: "Strengths" },
  { key: "weaknesses", label: "Weaknesses" },
] as const;

export default function CompetitorsPage() {
  const { project, save } = useProjectSlice("competitors");
  const [name, setName] = useState("");
  const [feature, setFeature] = useState("");
  const [isConfirmingDraft, setIsConfirmingDraft] = useState(false);
  const [message, setMessage] = useState<string>();
  if (!project) return null;
  const { competitors } = project;
  const analysis = analyzeCompetitors(competitors);
  const editItem = (id: string, patch: Partial<Item>) =>
    save((c) => ({ ...c, items: patchItem(c.items, id, patch) }));

  function addCompetitor(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    save((c) => ({
      ...c,
      items: [
        ...c.items,
        {
          id: newId(),
          name: name.trim(),
          url: "",
          notes: "",
          strengths: "",
          weaknesses: "",
          features: [],
        },
      ],
    }));
    setName("");
  }

  function addFeature(event: FormEvent) {
    event.preventDefault();
    if (!feature.trim()) return;
    save((c) => ({ ...c, features: [...c.features, { id: newId(), label: feature.trim() }] }));
    setFeature("");
  }

  const removeFeature = (id: string) =>
    save((c) => ({
      ...c,
      features: removeItem(c.features, id),
      ours: c.ours.filter((x) => x !== id),
      items: c.items.map((item) => ({ ...item, features: item.features.filter((x) => x !== id) })),
    }));

  const draftPositioning = () =>
    save((c) => ({ ...c, positioning: positioningTemplate(project).slice(0, 600) }));

  function addToIdea() {
    const ok = updateProject(project!.id, (p) => ({
      ...p,
      idea: {
        ...p.idea,
        differentiation: appendText(p.idea.differentiation, p.competitors.positioning),
      },
    }));
    setMessage(
      ok
        ? "Added your positioning to Differentiation in Idea Studio."
        : "Differentiation is full. Shorten it first.",
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Competitor Analysis">
        Record the alternatives your customers use today. LaunchLab does not look anything up, so
        enter only what you found yourself and note where you found it.
      </ToolHeader>

      <Panel
        title="Competitors and alternatives"
        description="Include indirect ones: a spreadsheet, a group chat, or doing nothing all count."
      >
        <form onSubmit={addCompetitor} className="flex gap-2">
          <input
            aria-label="Competitor name"
            placeholder="Name of a product, service, or habit"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={competitors.items.length >= MAX_COMPETITORS || !name.trim()}
          >
            Add
          </Button>
        </form>
        <div className="grid gap-4 lg:grid-cols-2">
          {competitors.items.map((item, index) => {
            const link = safeUrl(item.url);
            const label = item.name || `competitor ${index + 1}`;
            return (
              <article
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-line p-4"
              >
                <input
                  aria-label={`Name of competitor ${index + 1}`}
                  value={item.name}
                  maxLength={80}
                  onChange={(e) => editItem(item.id, { name: e.target.value })}
                  className={`${inputClass} font-semibold`}
                />
                <input
                  aria-label={`Source link for ${label}`}
                  type="url"
                  placeholder="https:// (where you found this)"
                  value={item.url}
                  maxLength={300}
                  onChange={(e) => editItem(item.id, { url: e.target.value })}
                  className={inputClass}
                />
                {item.url.trim() &&
                  (link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-accent underline underline-offset-2"
                    >
                      Open source: {link}
                    </a>
                  ) : (
                    <p className="text-xs text-warn">
                      Only links starting with http:// or https:// are opened.
                    </p>
                  ))}
                {TEXT_FIELDS.map((field) => (
                  <textarea
                    key={field.key}
                    aria-label={`${field.label} (${label})`}
                    placeholder={field.label}
                    rows={2}
                    maxLength={600}
                    value={item[field.key]}
                    onChange={(e) => editItem(item.id, { [field.key]: e.target.value })}
                    className={`${inputClass} resize-y`}
                  />
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start !text-danger"
                  aria-label={`Delete ${label}`}
                  onClick={() => save((c) => ({ ...c, items: removeItem(c.items, item.id) }))}
                >
                  Delete
                </Button>
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Feature comparison"
        description="List what customers care about, then tick who offers it, based on what you have checked."
      >
        <form onSubmit={addFeature} className="flex gap-2">
          <input
            aria-label="New feature to compare"
            placeholder="e.g. Free to use"
            value={feature}
            maxLength={60}
            onChange={(e) => setFeature(e.target.value)}
            className={inputClass}
          />
          <Button
            type="submit"
            disabled={competitors.features.length >= MAX_FEATURES || !feature.trim()}
          >
            Add feature
          </Button>
        </form>
        {competitors.features.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr>
                  <th scope="col" className="p-2 text-left font-medium text-muted">
                    Feature
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    {project.name} (you)
                  </th>
                  {competitors.items.map((item) => (
                    <th key={item.id} scope="col" className="p-2 font-semibold">
                      {item.name}
                    </th>
                  ))}
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {competitors.features.map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <th scope="row" className="p-2 text-left font-normal">
                      {f.label}
                    </th>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${project.name} offers ${f.label}`}
                        checked={competitors.ours.includes(f.id)}
                        onChange={() => save((c) => ({ ...c, ours: toggle(c.ours, f.id) }))}
                        className="size-4 accent-accent"
                      />
                    </td>
                    {competitors.items.map((item) => (
                      <td key={item.id} className="p-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${item.name} offers ${f.label}`}
                          checked={item.features.includes(f.id)}
                          onChange={() =>
                            editItem(item.id, { features: toggle(item.features, f.id) })
                          }
                          className="size-4 accent-accent"
                        />
                      </td>
                    ))}
                    <td className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove feature ${f.label}`}
                        onClick={() => removeFeature(f.id)}
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {competitors.features.length > 0 && competitors.items.length > 0 && (
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-raised p-3">
              <p className="font-semibold">Only you</p>
              <p className="mt-1 text-muted">
                {analysis.onlyUs.map((f) => f.label).join(", ") ||
                  "Nothing yet. What could you offer that no one else does?"}
              </p>
            </div>
            <div className="rounded-xl bg-raised p-3">
              <p className="font-semibold">Everyone else has it</p>
              <p className="mt-1 text-muted">
                {analysis.gaps.map((f) => f.label).join(", ") || "No gaps found."}
              </p>
            </div>
            <div className="rounded-xl bg-raised p-3">
              <p className="font-semibold">Shared</p>
              <p className="mt-1 text-muted">
                {analysis.shared.map((f) => f.label).join(", ") || "None."}
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Positioning"
        description="One sentence on who it is for and why it is different. This is your claim; test it in interviews."
        actions={
          <>
            <Button
              size="sm"
              onClick={() =>
                competitors.positioning.trim() ? setIsConfirmingDraft(true) : draftPositioning()
              }
            >
              Draft from template
            </Button>
            <Button size="sm" onClick={addToIdea} disabled={!competitors.positioning.trim()}>
              Add to Idea Studio
            </Button>
          </>
        }
      >
        <textarea
          aria-label="Positioning statement"
          rows={4}
          maxLength={600}
          value={competitors.positioning}
          onChange={(e) => save((c) => ({ ...c, positioning: e.target.value }))}
          className={`${inputClass} resize-y`}
        />
        <div className="flex flex-wrap gap-2">
          <Badge tone="warn">Assumption until tested</Badge>
        </div>
        {message && <StatusMessage>{message}</StatusMessage>}
      </Panel>

      <Confirm
        open={isConfirmingDraft}
        title="Replace your positioning?"
        confirmLabel="Replace it"
        onClose={() => setIsConfirmingDraft(false)}
        onConfirm={draftPositioning}
      >
        Your current positioning statement will be replaced with a template built from your idea and
        this page.
      </Confirm>
    </div>
  );
}
