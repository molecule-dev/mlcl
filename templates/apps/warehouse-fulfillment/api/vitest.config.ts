import { defineConfig } from 'vitest/config'

/**
 * Handler/unit tests import cold module graphs (bond + provider boot) that
 * can exceed vitest's 5s default on modest hardware — 30s keeps the suite
 * deterministic under load.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
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
