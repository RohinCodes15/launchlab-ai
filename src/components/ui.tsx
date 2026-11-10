"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { buttonClass, type BUTTON_VARIANTS } from "./button-class";

export { buttonClass };

interface ButtonProps extends ComponentProps<"button"> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: "sm" | "md";
}

export function Button({ variant, size, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted/70 transition-colors focus:border-accent";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** Receives the ids to wire onto the control. */
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
  aside?: ReactNode;
}

export function Field({ label, hint, error, children, aside }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {aside}
      </div>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined })}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warn";
}) {
  const tones = {
    neutral: "bg-raised text-muted",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-raised"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

/** Native <dialog>: focus trapping, Escape to close and the backdrop come from the browser. */
export function Modal({ open, onClose, title, children, wide = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    dialog.showModal();
    // Also runs when Next.js hides this page after navigation: an open modal left
    // behind in a hidden page would keep the rest of the document inert.
    return () => dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50 ${
        wide ? "max-w-4xl" : "max-w-md"
      }`}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function Confirm({
  open,
  title,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
  children,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-muted">{children}</div>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function EmptyState({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="max-w-md text-sm text-muted">{children}</p>
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

interface PanelProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** A titled section card used by the project tools. */
export function Panel({ title, description, actions, children }: PanelProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-semibold">
            {title}
          </h3>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly (T | { value: T; label: string })[];
  onChange: (value: T) => void;
  className?: string;
}

/** A compact select whose label is read by screen readers but not shown. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: SelectProps<T>) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={`${inputClass} w-auto ${className}`}
    >
      {options.map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        );
      })}
    </select>
  );
}

/** Says where a piece of content came from, so drafts are never mistaken for the student's own work or for evidence. */
export function SourceBadge({ source }: { source: "user" | "suggested" }) {
  return source === "suggested" ? <Badge tone="warn">Suggested draft</Badge> : <Badge>Yours</Badge>;
}

export function ToolHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">{children}</p>
    </div>
  );
}

const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replaceAll("-", " ");

/** Turn schema enum values into select options, with optional custom labels. */
export const toOptions = <T extends string>(
  values: readonly T[],
  labels?: Partial<Record<T, string>>,
) => values.map((value) => ({ value, label: labels?.[value] ?? titleCase(value) }));

export function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-sm text-ok">
      {children}
    </p>
  );
}
