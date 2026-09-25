/**
 * Which browser runs the e2e specs — a bond, picked per environment by
 * `@molecule/app-e2e` (`MOL_E2E_PROVIDER`, else the environment):
 *
 * - `@molecule/app-e2e-playwright`: a real browser. The default everywhere a
 *   browser is installed — your machine, CI, and a molecule sandbox.
 * - `@molecule/app-e2e-preview`: the live preview the IDE is showing (what the
 *   IDE's Tests panel uses). `npm run dev` (scripts/dev.ts) serves the bridge
 *   this bond talks to.
 *
 * `test` from `@molecule/app-e2e` reads the same answer, so the runner and the
 * bonded provider always agree; this file is imported by `_helpers.ts`, so
 * every spec gets it.
 */
import { resolveE2EProviderName, setProvider } from '@molecule/app-e2e'
import { provider as playwright } from '@molecule/app-e2e-playwright'
import { provider as preview } from '@molecule/app-e2e-preview'

setProvider(resolveE2EProviderName() === 'preview' ? preview : playwright)
