"use client";

import { useState } from "react";
import { Badge, Button, Confirm, EmptyState, Modal, inputClass } from "@/components/ui";
import { useCurrentProject } from "@/components/use-current-project";
import { MISSING, findUnverifiedClaims, generateSlides, moveSlide, slideLabel } from "@/lib/pitch";
import { SLIDE_TITLE_MAX, TEXT_MAX, type Slide } from "@/lib/schema";
import { updateProject } from "@/lib/store";

function SlideFace({ slide, number, total }: { slide: Slide; number: number; total: number }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-8 sm:p-12">
      <p className="text-xs font-medium uppercase tracking-widest text-accent">
        {slideLabel(slide.kind)}
      </p>
      <h3 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{slide.title}</h3>
      <p className="mt-6 flex-1 whitespace-pre-wrap text-base leading-relaxed sm:text-lg">
        {slide.body}
      </p>
      <p className="mt-6 text-right text-xs text-muted">
        {number} / {total}
      </p>
    </div>
  );
}

function Preview({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const go = (step: number) => setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + step)));
  return (
    <div
      className="flex flex-col gap-4"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="min-h-[55vh]" aria-live="polite">
        <SlideFace slide={slides[index]} number={index + 1} total={slides.length} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => go(-1)} disabled={index === 0}>
          Previous
        </Button>
        <span className="text-xs text-muted">Use the ← and → keys</span>
        <div className="flex gap-2">
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            autoFocus
            onClick={() => go(1)}
            disabled={index === slides.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PitchPage() {
  const { project } = useCurrentProject();
  const [isConfirmingRegenerate, setIsConfirmingRegenerate] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  if (!project) return null;
  const current = project;
  const { slides } = current;

  const setSlides = (change: (slides: Slide[]) => Slide[]) =>
    updateProject(current.id, (p) => ({ ...p, slides: change(p.slides) }));
  const generate = () => setSlides(() => generateSlides(current, () => crypto.randomUUID()));
  const editSlide = (id: string, patch: Partial<Slide>) =>
    setSlides((all) => all.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));

  if (slides.length === 0) {
    return (
      <EmptyState
        title="Build your pitch."
        actions={
          <Button variant="primary" onClick={generate}>
            Generate pitch outline
          </Button>
        }
      >
        LaunchLab arranges what you wrote in Idea Studio and the canvas into nine slides. It copies
        your words and adds nothing of its own, so the more you have written, the better the draft.
      </EmptyState>
    );
  }

  const flaggedCount = slides.filter(
    (slide) =>
      findUnverifiedClaims(`${slide.title} ${slide.body}`).length > 0 ||
      slide.body.includes(MISSING),
  ).length;

  return (
    <>
      <div className="no-print flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Pitch Builder</h2>
            <p className="mt-1 text-sm text-muted">
              {slides.length} slides, saved as you type.{" "}
              {flaggedCount > 0
                ? `${flaggedCount} ${flaggedCount === 1 ? "slide needs" : "slides need"} attention before you present.`
                : "No unverified claims detected."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsConfirmingRegenerate(true)}>Regenerate</Button>
            <Button onClick={() => setIsPreviewing(true)}>Preview</Button>
            <Button variant="primary" onClick={() => window.print()}>
              Export PDF
            </Button>
          </div>
        </div>

        <ol className="flex flex-col gap-4">
          {slides.map((slide, index) => {
            const claims = findUnverifiedClaims(`${slide.title} ${slide.body}`);
            const isIncomplete = slide.body.includes(MISSING);
            const label = `slide ${index + 1}, ${slideLabel(slide.kind)}`;
            return (
              <li key={slide.id} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="grid size-6 place-items-center rounded-full bg-raised text-xs">
                      {index + 1}
                    </span>
                    {slideLabel(slide.kind)}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      aria-label={`Move ${label} up`}
                      onClick={() => setSlides((all) => moveSlide(all, index, -1))}
                    >
                      ↑ Up
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === slides.length - 1}
                      aria-label={`Move ${label} down`}
                      onClick={() => setSlides((all) => moveSlide(all, index, 1))}
                    >
                      ↓ Down
                    </Button>
                  </div>
                </div>
                <input
                  value={slide.title}
                  maxLength={SLIDE_TITLE_MAX}
                  aria-label={`Title of ${label}`}
                  onChange={(event) => editSlide(slide.id, { title: event.target.value })}
                  className={`${inputClass} mt-3 font-display text-xl`}
                />
                <textarea
                  value={slide.body}
                  rows={5}
                  maxLength={TEXT_MAX}
                  aria-label={`Content of ${label}`}
                  onChange={(event) => editSlide(slide.id, { body: event.target.value })}
                  className={`${inputClass} mt-2 resize-y`}
                />
                {(claims.length > 0 || isIncomplete) && (
                  <div className="mt-3 flex flex-col gap-1.5 rounded-lg bg-warn-soft p-3 text-sm text-warn">
                    {isIncomplete && (
                      <p>
                        This slide still has a placeholder. Write the missing part or remove it.
                      </p>
                    )}
                    {claims.length > 0 && (
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">Unverified claim?</span>
                        {claims.map((claim) => (
                          <Badge key={claim} tone="warn">
                            {claim}
                          </Badge>
                        ))}
                        <span>Add a source, or say it is a goal or an assumption.</span>
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="print-only">
        {slides.map((slide, index) => (
          <div key={slide.id} className="print-slide">
            <SlideFace slide={slide} number={index + 1} total={slides.length} />
          </div>
        ))}
      </div>

      <Modal
        open={isPreviewing}
        onClose={() => setIsPreviewing(false)}
        title="Presentation preview"
        wide
      >
        <Preview slides={slides} onClose={() => setIsPreviewing(false)} />
      </Modal>
      <Confirm
        open={isConfirmingRegenerate}
        title="Regenerate the outline?"
        confirmLabel="Replace my slides"
        onClose={() => setIsConfirmingRegenerate(false)}
        onConfirm={generate}
      >
        All nine slides will be rebuilt from your current idea and canvas. Edits you made to the
        slides, and their order, will be lost.
      </Confirm>
    </>
  );
}
