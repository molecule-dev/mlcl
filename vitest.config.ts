import { createRequire } from 'node:module'
import { dirname } from 'node:path'

import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)

/**
 * Absolute directory of a package, resolved by normal Node lookup from THIS
 * file.
 *
 * Deliberately not a hardcoded `../node_modules/<name>`: that path is the
 * WORKSPACE ROOT's, so it only exists when mlcl sits inside molecule-workspace.
 * In a standalone checkout — which is exactly how CI builds it — there is no
 * `../node_modules`, and every test importing react died with "Failed to
 * resolve import react". Resolving by name finds the one copy wherever it
 * actually is: hoisted to the workspace root locally, mlcl's own node_modules in
 * CI. Same guarantee, no assumption about the checkout layout.
 *
 * @param name - Package name to resolve.
 * @returns Absolute path to the package directory.
 */
function packageDir(name: string): string {
  return dirname(require.resolve(`${name}/package.json`))
}

export default defineConfig({
  // React and react-dom MUST resolve to ONE copy.
  //
  // Two identical installs exist in this workspace — `node_modules/react` at the
  // root and `molecule/node_modules/react` — and without deduping, `react-dom`
  // loads the root one while a `@molecule/*-react` package's dist loads
  // molecule's. Two module instances means two sets of React internals: the
  // renderer sets its hook dispatcher on one, the hook reads `null` off the
  // other, and it surfaces as `TypeError: Cannot read properties of null
  // (reading 'useMemo')` thrown from inside the package rather than from
  // anything the test did. The workspace AGENTS.md records this trap for the
  // scaffolded Vite config; it applies identically here, because these tests
  // render real components out of those packages.
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router'],
    // `dedupe` is advisory for anything Vite does not process, and the stack
    // trace proves it was not enough on its own: react-dom loaded from
    // `<root>/node_modules` while the hook's `useMemo` came from
    // `molecule/node_modules/react`. Absolute aliases are not advisory.
    alias: {
      react: packageDir('react'),
      'react-dom': packageDir('react-dom'),
      // Routing hooks and their mounted router must also share one context.
      // Linked molecule bonds otherwise find molecule/node_modules/react-router,
      // whose externalized React bypasses the aliases above.
      'react-router': packageDir('react-router'),
    },
  },
  test: {
    // …and `dedupe` alone is not enough, because vitest EXTERNALIZES linked
    // packages by default: Node then resolves their `react` import by walking up
    // from `molecule/packages/…`, finds `molecule/node_modules/react`, and never
    // consults Vite's resolver at all. Inlining the `@molecule/*` packages routes
    // them through Vite, where the dedupe above actually applies.
    server: {
      deps: {
        inline: [/@molecule\//],
      },
    },
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    include: ['src/**/__tests__/**/*.test.ts'],
    pool: 'forks',
  },
})
