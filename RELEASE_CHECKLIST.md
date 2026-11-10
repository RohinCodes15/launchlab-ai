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
- ⬜ Commit author email (`rohincodes15@gmail.com`) becomes public when the repository is pushed. Accept, or change the git author for future commits.

## Production basics

- ✅ App icon (`src/app/icon.svg`), page titles, description, Open Graph and Twitter preview image
- ✅ `robots.txt` (blocks `/api/` and private project pages) and `sitemap.xml`
- ✅ Node 22+ declared in `package.json`
- ✅ No environment variables required

## Publishing (needs owner approval)

- ✅ License chosen (MIT) and `LICENSE` file added
- ⬜ GitHub repository created and `main` pushed
- ⬜ GitHub Actions CI passes on GitHub
- ⬜ Vercel project created and deployed (Hobby plan, no environment variables)
- ⬜ Live site: all workflows, persistence, backup, headers, offline coach, no console errors
- ⬜ README and PORTFOLIO_NOTES updated with real URLs

## After release

- ⬜ Remove the `minimatch` override in `package.json` once `typescript-eslint` ships the fix
- ⬜ Rate limits are per server instance; revisit if AI is ever enabled publicly
