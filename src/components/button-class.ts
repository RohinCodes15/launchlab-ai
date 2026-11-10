/** Shared by server and client components, so it lives outside the client-only ui module. */
export const BUTTON_VARIANTS = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  secondary: "border border-line bg-surface text-fg hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-fg",
  danger: "border border-line bg-surface text-danger hover:bg-raised",
} as const;

export const buttonClass = (
  variant: keyof typeof BUTTON_VARIANTS = "secondary",
  size: "sm" | "md" = "md",
) =>
  `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
    size === "sm" ? "min-h-8 px-2.5 text-sm" : "min-h-10 px-4 text-sm"
  } ${BUTTON_VARIANTS[variant]}`;
