import { defineConfig } from 'vitest/config'

/**
 * Handler/unit tests import cold module graphs (bond + provider boot) that
 * can exceed vitest's 5s default on modest hardware — 30s keeps the suite
 * deterministic under load.
 *
 * `@molecule/*` packages are INLINED into Vite's module graph so per-suite
 * `vi.mock('@molecule/…')` factories intercept the packages' own imports.
 * Externalized (native-Node) ESM would bypass the mocker entirely: a handler
 * imported from dist would run the REAL `@molecule/api-database` (throwing
 * "No 'datastore' provider bonded" → 500) no matter what the test mocked.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
    server: {
      deps: {
        inline: [/@molecule\//],
      },
    },
  },
})
