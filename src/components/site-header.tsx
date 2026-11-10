"use client";

import Link from "next/link";
import { useSaveFailed } from "@/lib/store";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("launchlab.theme", next);
  } catch {
    // The theme still applies for this visit; it just will not be remembered.
  }
}

export function SiteHeader() {
  const saveFailed = useSaveFailed();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg"
          >
            L
          </span>
          LaunchLab <span className="text-muted">AI</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            Dashboard
          </Link>
          <Link
            href="/backup"
            className="rounded-md px-3 py-2 text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            Backup
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Switch between light and dark theme"
            className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4.5">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" />
            </svg>
          </button>
        </nav>
      </div>
      {saveFailed && (
        <p role="alert" className="bg-warn-soft px-4 py-2 text-center text-sm text-warn">
          This browser is blocking or has run out of local storage, so your latest changes are not
          being saved. Free up space or leave private browsing, then edit again.
        </p>
      )}
    </header>
  );
}
