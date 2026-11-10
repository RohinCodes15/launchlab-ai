"use client";

import { useState } from "react";
import { Button, Confirm, inputClass } from "@/components/ui";
import { useCurrentProject } from "@/components/use-current-project";
import { suggestBlock } from "@/lib/canvas";
import { CANVAS_BLOCKS, TEXT_MAX, type CanvasKey } from "@/lib/schema";
import { updateProject } from "@/lib/store";

export default function CanvasPage() {
  const { project } = useCurrentProject();
  const [replacing, setReplacing] = useState<CanvasKey>();
  if (!project) return null;
  const current = project;

  const setBlock = (key: CanvasKey, value: string) =>
    updateProject(current.id, (p) => ({
      ...p,
      canvas: { ...p.canvas, [key]: value.slice(0, TEXT_MAX) },
    }));

  function handleSuggest(key: CanvasKey) {
    if (current.canvas[key].trim()) setReplacing(key);
    else setBlock(key, suggestBlock(key, current));
  }

  function fillEmptyBlocks() {
    updateProject(current.id, (p) => ({
      ...p,
      canvas: Object.fromEntries(
        CANVAS_BLOCKS.map((block) => [
          block.key,
          p.canvas[block.key].trim()
            ? p.canvas[block.key]
            : suggestBlock(block.key, p).slice(0, TEXT_MAX),
        ]),
      ) as typeof p.canvas,
    }));
  }

  const emptyCount = CANVAS_BLOCKS.filter((block) => !current.canvas[block.key].trim()).length;
  const replacingBlock = CANVAS_BLOCKS.find((block) => block.key === replacing);

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">Business Model Canvas</h2>
          <p className="mt-1 text-sm text-muted">
            Each block saves as you type. Drafts are templates built from your idea, not AI output.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={fillEmptyBlocks} disabled={emptyCount === 0}>
            Draft {emptyCount || "all"} empty {emptyCount === 1 ? "block" : "blocks"}
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            Print or save as PDF
          </Button>
        </div>
      </div>

      <h2 className="print-only font-display text-3xl">{current.name}: Business Model Canvas</h2>

      <div className="bmc">
        {CANVAS_BLOCKS.map((block, index) => {
          const value = current.canvas[block.key];
          const fieldId = `canvas-${block.key}`;
          return (
            <section
              key={block.key}
              data-area={block.area}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <label htmlFor={fieldId} className="text-sm font-semibold">
                  <span className="mr-1.5 text-accent">{index + 1}</span>
                  {block.label}
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="no-print -mr-1 -mt-1 shrink-0"
                  aria-label={`Suggest a draft for ${block.label}`}
                  onClick={() => handleSuggest(block.key)}
                >
                  Suggest
                </Button>
              </div>
              <p id={`${fieldId}-hint`} className="no-print text-xs text-muted">
                {block.hint}
              </p>
              <textarea
                id={fieldId}
                value={value}
                maxLength={TEXT_MAX}
                aria-describedby={`${fieldId}-hint`}
                onChange={(event) => setBlock(block.key, event.target.value)}
                className={`${inputClass} no-print min-h-32 flex-1 resize-y`}
              />
              <p className="print-only whitespace-pre-wrap text-xs">{value || "—"}</p>
            </section>
          );
        })}
      </div>

      <Confirm
        open={Boolean(replacing)}
        title={`Replace ${replacingBlock?.label ?? "this block"}?`}
        confirmLabel="Replace my text"
        onClose={() => setReplacing(undefined)}
        onConfirm={() => replacing && setBlock(replacing, suggestBlock(replacing, current))}
      >
        <p>Your current text in this block will be overwritten with this draft:</p>
        <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-raised p-3 text-fg">
          {replacing && suggestBlock(replacing, current)}
        </p>
      </Confirm>
    </div>
  );
}
