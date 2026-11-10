"use client";

import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <EmptyState
        title="Something went wrong."
        actions={
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
        }
      >
        This page hit an unexpected error. Your saved projects are not affected.
      </EmptyState>
    </div>
  );
}
