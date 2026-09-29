import { defineConfig } from 'vitest/config'

/**
 * Handler/unit tests import cold module graphs (bond + provider boot) that
 * can exceed vitest's 5s default on modest hardware — 30s keeps the suite
 * deterministic under load.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
  },
})
