# Portfolio notes

## Links

- **Live site:** https://launchlab-ai-six.vercel.app (Vercel, offline coach, no environment variables)
- **Source code:** https://github.com/RohinCodes15/launchlab-ai (MIT license, GitHub Actions CI passing)

## What it is

LaunchLab AI is a free web app that teaches high school students how to turn a startup idea into a plan they can defend. A student creates a project, writes the idea, and works through connected tools: structured coaching, a Validation Lab for testing assumptions with real people, a Finance Studio for pricing and cash, customer personas, competitor analysis, an MVP roadmap, a Business Model Canvas, a nine-slide pitch that exports to PDF, written pitch practice, and short lessons tied to the student's own project. It works without accounts or paid services: projects live in the browser and can be exported as backup files.

## Technology (verified in `package.json`)

Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Zod 4, the Anthropic TypeScript SDK (optional, off by default), Vitest, Playwright with axe-core, Prettier and ESLint, GitHub Actions. No database, component library, or charting library.

## Architecture

- **Browser-local data.** One module (`src/lib/store.ts`) reads and writes `localStorage`. Everything is checked against Zod schemas when loaded, one project at a time, and every edit is checked before it is saved, so a stored project can never become unreadable.
- **Pure domain logic.** Finance formulas, validation summaries, practice scoring, backup import, roadmap and lesson logic are plain TypeScript functions with unit tests.
- **One server endpoint.** `/api/coach` is stateless. It validates and size-limits each request, rate-limits each client, and calls a coach provider: a deterministic rule-based one by default, or Claude when explicitly configured. If the AI fails, it falls back to the rule-based coach and says so.
- **Schema-based migrations.** Fields added after version 1 have defaults, so projects saved earlier load with empty tools.
- **Security.** Content-Security-Policy and other security headers; user text rendered as text; user links filtered to http/https; imported files size-limited and re-validated; the API key never reaches the browser.

## Implemented features

Landing page; privacy page; dashboard with search, filters, progress and a fictional demo project; project create, edit, duplicate, archive, delete; Idea Studio with autosave; Startup Coach with reviews, follow-ups and history; Business Model Canvas with drafts, confirm-before-replace and printing; Pitch Builder with generation, editing, reordering, preview, unverified-claim flags and PDF export; Validation Lab (hypotheses, interview guide and notes, survey builder and summaries, evidence board, experiments, next steps); Finance Studio (four scenarios, margin, break-even, 12-month cash flow, runway, comparison, keyboard-accessible chart); Pitch Practice (six categories, scored feedback, history); personas; competitor analysis with a feature matrix; MVP roadmap with scoring, milestones, a board and dependencies; five lessons with quizzes; Backup Center with export, validated import, merge and replace; buttons that move information between tools; light and dark themes; responsive layouts.

Not implemented: accounts, a database, cross-device sync, drag and drop on the board. The Claude path has not been run against the live API.

## Test results (2026-11-10)

- 98/98 unit and API tests (Vitest)
- 34/34 browser test runs: 17 scenarios on desktop and mobile viewports, against the production build (Playwright)
- Automated accessibility checks (axe) clean on all 14 screens in light and dark themes
- Lint and typecheck clean; production build passes; `npm audit` 0 vulnerabilities
- GitHub Actions CI: passing on `main`
- Live site: the same 34 browser runs pass against the production deployment; a scripted walk through every page on desktop and mobile showed no console errors or failed requests

## Resume bullets

Each is backed by code and tests in the repository.

- Built and tested LaunchLab AI, a Next.js 16 / TypeScript web app with twelve connected tools that guide students from a startup idea through assumption testing, financial modelling, and an exportable pitch deck.
- Designed a pluggable AI feedback layer with a deterministic offline coach and an optional Claude integration behind a rate-limited, size-limited, Zod-validated API route, with automatic fallback and clear labelling of rule-based output.
- Protected browser-stored user data with per-record validation, an edit gate that rejects any change that would corrupt a project, default-based schema migrations, and a versioned JSON backup and restore feature, verified by 98 unit tests and a 34-run Playwright suite with accessibility checks.

## Interview explanation (about 30 seconds)

"LaunchLab is a startup learning app I built for students. You write an idea, then test it: record interviews and evidence, model break-even and cash, and build a pitch. Everything connects, so evidence you collect can go straight into your pitch. I kept it free and private by storing data in the browser instead of a database, which meant I had to be careful about protecting that data, so every edit is validated before it's saved. The coach works offline with rules, and I added an optional Claude integration but made sure the app never claims rule-based feedback is AI. The part I learned most from was testing: Playwright caught a bug where a dialog left open on a hidden page froze the next page."

## Technical challenges worth discussing

- **A hidden page froze the app.** Next.js keeps the previous page mounted but hidden. A dialog left open there made the next page unresponsive. Browser tests caught it; the fix closes dialogs before navigating.
- **Reading browser storage without hydration errors,** using `useSyncExternalStore` with a separate "ready" flag.
- **Growing the data model safely** across a major release with defaults, proven by a test that loads old data.
- **Flaky tests that were real bugs:** an opacity fade made contrast checks fail at random, and the shared test address tripped the coach rate limit. Both were fixed at the cause rather than retried.
- **Honest output:** the rule-based coach is labelled everywhere, and the demo project contains assumptions only, never invented evidence.

## What to review and understand yourself

This code was written with an AI coding assistant. Before presenting it as your work, be able to explain:

1. `src/lib/store.ts` and `applyChange` in `src/lib/projects.ts`: how data is loaded, why every edit is validated.
2. `src/lib/schema.ts`: how Zod schemas become types, and how `.default()` handles older saved data.
3. `src/app/api/coach/route.ts`: each check in order, and why the in-memory rate limiter is a limitation.
4. `src/lib/ai/`: the provider interface, when fallback happens, and that `offline.ts` is rules, not a model.
5. `src/lib/finance.ts`: work out break-even and runway by hand for one scenario.
6. `src/lib/backup.ts`: what merge does with a duplicate id, and why imports are re-validated.
7. `next.config.ts`: what the Content-Security-Policy blocks and why it allows inline scripts.
8. Why there is no database, and what you would build to add one safely.

Be upfront that an AI assistant helped. Being able to explain every part matters more than having typed it.
