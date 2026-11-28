import { defineConfig } from 'vitest/config'

/**
 * Handler/unit tests import cold module graphs (bond + provider boot) that
 * can exceed vitest's defaults (5 s a test, 10 s a hook) on modest hardware.
 * 30 s keeps the suite deterministic under load. A `beforeAll` that creates
 * the server does a test's work, so hooks get the same time.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
