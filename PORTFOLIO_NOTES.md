# Portfolio notes

## What the app does

LaunchLab AI guides a student through one startup project: write the idea, get structured coaching, test assumptions (hypotheses, interviews, surveys, evidence, experiments), model pricing and cash, describe personas and competitors, plan an MVP roadmap, fill in a Business Model Canvas, build a nine-slide pitch that exports to PDF, and practise answering pitch questions. Short lessons tie each concept to a task in the student's own project, and projects can be exported and imported as backup files.

## Technologies

Next.js 16 (App Router), React 19, TypeScript in strict mode, Tailwind CSS 4, Zod 4, the Anthropic TypeScript SDK (optional path), Vitest, Playwright with axe-core, GitHub Actions.

## Technical challenges

- **A hidden page froze the app.** Next.js 16 keeps the previous page mounted but hidden after navigation. The "New project" dialog stayed open inside the hidden dashboard, and an open modal dialog makes the rest of the document unresponsive, so typing in Idea Studio did nothing. The browser tests caught it. The fix was to close the dialog before navigating and on effect cleanup.
- **Reading browser storage without hydration errors.** The server cannot see `localStorage`, so the store uses `useSyncExternalStore` with an empty server snapshot and a separate "ready" flag to tell "still loading" from "no projects".
- **Not losing data to one bad record.** Stored projects are validated one at a time, and the unreadable original is copied to a backup key before anything is written back.
- **One schema for three consumers.** The same Zod schemas validate browser storage, the API request, and the model's structured output.
- **Honest AI.** The offline coach is rule-based, so the interface labels it that way everywhere, and an AI failure falls back with a visible notice.
- **Growing the data model without breaking saved data.** Eight tools were added after version 1 shipped. Every new field has a default, so old projects load with empty tools, and a unit test loads a version-1 project to prove it.
- **Making invalid data impossible to save.** Every list has a maximum. Instead of trusting each screen, every update is run through the project schema and refused if invalid, so a project can never be saved in a state that would make it unreadable.
- **Safe import.** Backup files are untrusted input: size-limited, re-validated per project, and merged so duplicate ids become separate copies instead of overwriting.
- **An accessible chart without a library.** The finance chart is hand-written SVG with a hover crosshair, keyboard reading with the arrow keys, a legend, a table view, and colours checked for colour-blind separation in both themes.

## Architectural decisions

- **Browser-local storage instead of a database.** With no login, a server database would be readable and writable by anyone. Keeping data in the browser gives real privacy with no backend to secure.
- **A provider interface for the coach.** The offline and Claude coaches implement the same two methods, so the app works with no key and the choice is one environment variable.
- **Print stylesheets instead of a PDF library.** The browser already produces PDFs; a print layout was less code and no extra dependency.
- **Pure domain modules.** Progress, duplication, filtering, canvas drafts, slide generation, and claim detection are plain functions, which is why they are easy to unit-test.
- **No component library.** A few Tailwind components and the native `<dialog>` element covered the need.
- **One AI route for all AI features.** Pitch practice reuses `/api/coach` and its provider interface (a third method), so it inherits the rate limit, validation, size limit, and fallback instead of duplicating them.
- **Copy between tools only on request.** Tools pass information along through explicit buttons that append, never silently overwrite, so students stay in control of their text.

## Features actually implemented

Landing page; dashboard with search, status filter, archive view, progress, and a demo project; project create, edit, duplicate, archive, restore, and delete; autosave with validation; offline coach with reviews, follow-up questions, and history; optional Claude coach with structured output, timeout, retry, and fallback; rate-limited and size-limited API route; health route; nine-block canvas with drafts and confirm-before-replace; pitch generation, editing, reordering, preview, claim flags, and PDF export through print; Validation Lab (hypotheses, interview guide and notes, survey builder with summaries, evidence board, experiments, rule-based next steps); Finance Studio (four scenarios, margin, break-even, cash flow, runway, comparison, interactive chart); Pitch Practice (six question categories, scored feedback, history, recurring advice); personas with comparison; competitor records, feature matrix and positioning; MVP roadmap with scoring, milestones, board and dependencies; five lessons with quizzes; backup export and import with merge and replace; cross-tool copy buttons; tool progress on the dashboard; Content-Security-Policy; light and dark themes; responsive layouts; loading, error, and not-found pages; 98 unit tests and 16 browser tests run on two viewports; CI workflow.

Not implemented: accounts, a database, cross-device sync, drag and drop on the board, deployment. The Claude path has not been run against the live API, and the CI workflow has not run on GitHub.

## How to demonstrate it

Follow the "Demo walkthrough" in the README (about five minutes). Good moments to show: the offline label on coach output, the unverified-claim flag appearing as you type a statistic, contradicting evidence changing the next steps, break-even becoming impossible when cost exceeds price, export → delete → import in the Backup Center, and `npm run check` passing.

## Resume bullet points

Each of these is backed by code and tests in this repository. Use only the ones you can explain.

- Built a full-stack Next.js 16 and TypeScript application with twelve integrated tools that take students from a startup idea through validation, financial modelling, a Business Model Canvas, and an exportable pitch deck.
- Implemented a finance engine (contribution margin, break-even, 12-month cash flow, runway) with unit-tested formulas and an accessible, keyboard-navigable SVG chart.
- Built a versioned JSON backup and restore feature with schema validation, partial recovery from damaged files, and duplicate-id handling, verified with automated round-trip tests.
- Evolved a browser-stored data model across a major release with default-based migrations and a validation gate that rejects any edit that would corrupt saved data.
- Designed a provider abstraction for AI feedback with a deterministic offline implementation and an optional Claude integration using schema-validated structured output, timeouts, and automatic fallback.
- Secured a public API route with per-client rate limiting, request size limits, and strict Zod validation, and kept API credentials server-side.
- Chose browser-local persistence with per-record validation and corruption backup to give users private data without an authentication system.
- Wrote 98 unit tests and a 16-scenario Playwright suite covering every tool's core workflow, accessibility on all 13 screens (axe, light and dark themes), keyboard use, and mobile layout, configured to run in GitHub Actions.
- Diagnosed and fixed a bug where a modal dialog left open in a hidden route made the next page unresponsive.

## What to review and understand yourself

This code was written with an AI coding assistant. Before presenting it as your work in an interview, be able to explain:

1. `src/lib/store.ts`: what `useSyncExternalStore` does and why there is a "ready" flag.
2. `src/lib/schema.ts`: how Zod schemas become TypeScript types, and what `.default()` and `.prefault()` do for older saved data.
3. `src/app/api/coach/route.ts` and `src/lib/ai/rate-limit.ts`: each check, in order, and why the rate limiter's in-memory design is a limitation.
4. `src/lib/ai/index.ts`: when the fallback happens and why the error message is not logged.
5. `src/lib/ai/offline.ts`: that it is rule-based. Do not describe it as a model.
6. `src/lib/pitch.ts`: the claim regexes and what they miss.
7. The modal bug above: reproduce it by removing the `onCancel()` call in the dashboard form.
8. Why there is no database, and what you would have to build to add one safely.
9. `src/lib/finance.ts`: derive break-even and runway by hand for one scenario and check the app agrees.
10. `src/lib/backup.ts`: what merge does with a duplicate id, and why every imported project is re-validated.
11. `applyChange` in `src/lib/projects.ts` and `updateProject` in `store.ts`: why validating every edit protects saved data.
12. `src/lib/practice.ts`: that practice feedback is regex checks, and what it cannot judge.
13. `next.config.ts`: what the CSP blocks and why it still allows inline scripts.

Be upfront that an AI assistant helped. Interviewers ask, and being able to explain every part matters more than having typed it.
