import { configDefaults, defineConfig } from 'vitest/config'
import { parseCLI } from 'vitest/node'

// A plain `vitest run` passes while the project has no tests yet, printing "No test files found".
// A run that names files still fails when none match, so a mistyped path is never a green run.
const { filter } = parseCLI(['vitest', ...process.argv.slice(2)])

/**
 * Handler/unit tests import cold module graphs (bond + provider boot) that
 * can exceed vitest's defaults (5 s a test, 10 s a hook) on modest hardware.
 * 30 s keeps the suite deterministic under load. A `beforeAll` that creates
 * the server does a test's work, so hooks get the same time.
 */
export default defineConfig({
  test: {
    // `tsc` compiles src/__tests__ into dist/, and vitest 4 no longer leaves dist out by
    // default: without this line every test runs twice after a build.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    passWithNoTests: filter.length === 0,
    server: {
      deps: {
        /**
         * orders-merchant.test.ts drives the REAL `@molecule/api-resource-order`
         * lifecycle handlers (refund/updateStatus/cancel) while mocking
         * `@molecule/api-database`. A natively-loaded (externalized) copy of
         * the package imports the real database module and dies on the unbonded
         * datastore before the mock can answer — inlining routes the package's
         * own imports through the same module runner that serves the mocks.
         */
        inline: ['@molecule/api-resource-order'],
      },
    },
  },
})
