/**
 * Which browser runs the e2e specs — a bond, picked per environment.
 *
 * - Inside a molecule sandbox (the `/etc/mol/app-root` marker exists) the
 *   specs drive the LIVE PREVIEW the IDE is showing, through
 *   `@molecule/app-e2e-preview`. No browser binary is installed there.
 * - On your machine and in CI they run on real Playwright browsers through
 *   `@molecule/app-e2e-playwright` (install them once with
 *   `npx playwright install chromium`).
 *
 * `MOL_E2E_PROVIDER=preview|playwright` overrides the choice. `test` from
 * `@molecule/app-e2e` reads the same answer, so the runner and the bonded
 * provider always agree; this file is imported by `_helpers.ts` (and by the
 * core as a fallback), so every spec gets it.
 */
import { resolveE2EProviderName, setProvider } from '@molecule/app-e2e'
import { provider as playwright } from '@molecule/app-e2e-playwright'
import { provider as preview } from '@molecule/app-e2e-preview'

setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
