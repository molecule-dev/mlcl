import { configDefaults, defineConfig } from 'vitest/config'

/**
 * Handler/unit tests import cold module graphs (bond + provider boot) that
 * can exceed vitest's defaults (5 s a test, 10 s a hook) on modest hardware.
 * 30 s keeps the suite deterministic under load. A `beforeAll` that creates
 * the server does a test's work, so hooks get the same time.
 *
 * `@molecule/*` packages are INLINED into Vite's module graph so per-suite
 * `vi.mock('@molecule/…')` factories intercept the packages' own imports.
 * Externalized (native-Node) ESM would bypass the mocker entirely: a handler
 * imported from dist would run the REAL `@molecule/api-database` (throwing
 * "No 'datastore' provider bonded" → 500) no matter what the test mocked.
 */
export default defineConfig({
  test: {
    // `tsc` compiles src/__tests__ into dist/, and vitest 4 no longer leaves dist out by
    // default: without this line every test runs twice after a build.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    server: {
      deps: {
        inline: [/@molecule\//],
      },
    },
  },
})
