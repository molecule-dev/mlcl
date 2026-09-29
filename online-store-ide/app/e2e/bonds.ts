/**
 * Which browser runs the e2e specs — a bond, picked per environment.
 *
 * - `@molecule/app-e2e-playwright` launches a real Playwright browser. A
 *   molecule sandbox ships Chromium (under `PLAYWRIGHT_BROWSERS_PATH`), so the
 *   specs run there against this app's dev server on `localhost` with no IDE
 *   tab involved — the same way they run on your machine and in CI (install
 *   the browser there once with `npx playwright install chromium`).
 * - `@molecule/app-e2e-preview` drives the LIVE PREVIEW the IDE is showing —
 *   the tab the person is watching. Pick it with `MOL_E2E_PROVIDER=preview`;
 *   it fails fast, naming the alternative, when no tab is attached.
 *
 * `MOL_E2E_PROVIDER=playwright|preview` overrides the choice; otherwise a
 * sandbox with a browser installed gets `playwright` (a sandbox without one,
 * an older image, gets `preview`) and everywhere else gets `playwright`. `test`
 * from `@molecule/app-e2e` reads the same answer, so the runner and the bonded
 * provider always agree; this file is imported by `_helpers.ts` (and by the
 * core as a fallback), so every spec gets it.
 */
import { resolveE2EProviderName, setProvider } from '@molecule/app-e2e'
import { provider as playwright } from '@molecule/app-e2e-playwright'
import { provider as preview } from '@molecule/app-e2e-preview'

setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
