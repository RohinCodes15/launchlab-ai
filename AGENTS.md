<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LaunchLab AI

An entrepreneurship learning app: idea → coach feedback → business model canvas → pitch.

## Commands

| Task                         | Command             |
| ---------------------------- | ------------------- |
| Dev server                   | `npm run dev`       |
| Lint                         | `npm run lint`      |
| Typecheck                    | `npm run typecheck` |
| Unit and API tests           | `npm test`          |
| Browser tests (builds first) | `npm run test:e2e`  |
| Everything                   | `npm run check`     |
| Format                       | `npm run format`    |

Run `npm run check` before committing. Browser tests need `npx playwright install chromium` once. Set `BASE_URL` to run the browser suite against a deployed site (use `--workers=1`: the live coach is rate-limited).

Deployment: Vercel project `launchlab-ai` (https://launchlab-ai-six.vercel.app), deployed with `vercel deploy --prod`. It is not connected to GitHub, so pushes do not deploy. No environment variables are set; do not add AI keys without the owner's approval.

## Architecture

- `src/lib/schema.ts`: every Zod schema and its inferred type. The single source of truth for data shapes.
- `src/lib/projects.ts`, `canvas.ts`, `pitch.ts`: pure domain logic, no React or browser APIs. Unit-tested.
- `src/lib/store.ts`: the only code that touches `localStorage`. Components read with `useProjects()` and write with `updateProject()`.
- `src/lib/ai/`: `CoachProvider` interface, the offline rule-based provider, the optional Anthropic provider, and `runCoach()` which falls back to offline on any failure.
- `src/app/api/coach/route.ts`: the only server endpoint that does work. Stateless.
- `src/lib/validation.ts`, `finance.ts`, `practice.ts`, `planning.ts` (personas, competitors, roadmap), `backup.ts`, `lessons.ts`: pure logic for the project tools. `list.ts` has the shared immutable list helpers.
- `src/lib/coach-client.ts`: the browser-side call to `/api/coach`, used by the coach and pitch practice.
- `src/app/projects/[id]/`: the four project steps and seven tools as client pages under one layout. Tools read and write their slice with `useProjectSlice(key)`.
- `src/app/backup/`: export and import of all projects.
- `src/components/line-chart.tsx`: the SVG chart. Series colours are `--series-1..4` in `globals.css`, validated for colour-blind separation in both themes.
- `src/components/ui.tsx`: shared client UI primitives. `button-class.ts` is separate so server components can use it.

## Conventions

- Immutable updates only. `updateProject(id, (p) => ({ ...p, ... }))`.
- Colours come from the CSS variables in `globals.css` (`bg-surface`, `text-muted`, ...). Do not hard-code colours or add `dark:` variants.
- New data fields go in `schema.ts` with a `.default()` so projects already saved in browsers still parse. That default is the migration; add a case to the "data migration" unit test.
- Every list in the schema has a `.max()`. `updateProject` refuses any change that fails the schema, so disable add buttons at the limit rather than relying on the refusal.
- Label where content came from: `source: "user" | "suggested"` and `SourceBadge`. Never add generated interviews, responses, evidence, or results.
- Copying between tools appends with `appendText`, only on an explicit button press. Replacing user text needs a `Confirm`.
- `Panel` headings are h3 inside a project tool; pass `level="h2"` on a top-level page.
- Dialogs use the native `<dialog>` through `Modal`. Close a modal before navigating away: Next.js keeps the previous page mounted but hidden.
- Tests live in `tests/unit` (Vitest) and `tests/e2e` (Playwright). Query by role and label.

## Security requirements

- Projects never leave the browser. Do not add a server endpoint that stores or returns project data unless authentication and per-user authorization ship in the same change.
- `ANTHROPIC_API_KEY` is server-only. Never read it in a client component, never prefix it with `NEXT_PUBLIC_`, never log it or return it.
- The app must work with no environment variables. AI stays off unless `AI_PROVIDER=anthropic` and a key are both set.
- Rule-based output must always be labelled as offline. Never present it as model output.
- Every request body is validated with Zod and size-limited before use. Keep the rate limiter on any route that can reach a paid API.
- Render user and model text as React text nodes. No `dangerouslySetInnerHTML` with dynamic content.
- Render user-entered URLs only through `safeUrl()` (http and https only) with `rel="noopener noreferrer"`.
- Imported files are untrusted: size-limit them and re-validate every project.
- Keep the Content-Security-Policy in `next.config.ts` restricted to `'self'`.
- Do not log request bodies or provider error messages; they can contain user text.
