# Release checklist

Run through this before every public release. Items marked ✅ were verified for the current release; ⬜ items need action.

## Local verification (2026-11-10)

- ✅ `npm ci` installs cleanly from the lockfile
- ✅ `npm audit`: 0 vulnerabilities
- ✅ `npm run lint`: clean
- ✅ `npm run typecheck`: clean
- ✅ `npm test`: 98/98 unit and API tests
- ✅ `npm run test:e2e`: 34/34 browser test runs (17 tests × desktop and mobile), against the production build
- ✅ `npm run build`: passes
- ✅ Accessibility (axe) clean on all 14 screens in light and dark themes
- ✅ No horizontal scrolling on mobile on those screens

## Security and privacy

- ✅ No `.env` files, keys, or tokens tracked or in git history
- ✅ No `ANTHROPIC_API_KEY`, `AI_PROVIDER`, or `api.anthropic.com` strings in browser bundles (`.next/static`)
- ✅ AI coach off unless `AI_PROVIDER=anthropic` **and** `ANTHROPIC_API_KEY` are set on the server
- ✅ `/api/health` reports `{"mode":"offline"}` with no configuration
- ✅ Security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- ✅ Coach route: rate limit, 20 KB body limit, strict validation
- ✅ Backup import: 5 MB limit, every project re-validated
- ✅ Privacy page explains browser-local storage
- ✅ Demo data is fictional
- ✅ Commit author email (`rohincodes15@gmail.com`) is public in the repository history (accepted by the owner)

## Production basics

- ✅ App icon (`src/app/icon.svg`), page titles, description, Open Graph and Twitter preview image
- ✅ `robots.txt` (blocks `/api/` and private project pages) and `sitemap.xml`
- ✅ Node 22+ declared in `package.json`
- ✅ No environment variables required

## Publishing (approved by the owner)

- ✅ License chosen (MIT) and `LICENSE` file added
- ✅ GitHub repository created and `main` pushed: https://github.com/RohinCodes15/launchlab-ai (public)
- ✅ GitHub Actions CI passes on GitHub (run 42866563080, 2m 10s)
- ✅ Vercel project `launchlab-ai` deployed: https://launchlab-ai-six.vercel.app (Hobby plan, no environment variables, Git auto-deploy disconnected)
- ✅ Live site: 34/34 browser runs pass against production (`BASE_URL=… npx playwright test --workers=1`); security headers present (plus HSTS from Vercel); `/api/health` reports offline; no console errors or failed requests on any page, desktop or mobile; no server errors in Vercel logs
- ✅ README and PORTFOLIO_NOTES updated with real URLs

## After release

- ⬜ Remove the `minimatch` override in `package.json` once `typescript-eslint` ships the fix
- ⬜ Rate limits are per server instance; revisit if AI is ever enabled publicly

## Redeploying

The Vercel project is not connected to GitHub, so pushes do not deploy. To release a new version: run every check above, then `vercel deploy --prod` from the repository root, then rerun the browser suite with `BASE_URL` set to the live URL.
