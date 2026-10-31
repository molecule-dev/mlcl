import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const APP_GUARD = join(MLCL_ROOT, 'templates/app/react/components/AuthGuard.tsx.tpl')
const APP_TEMPLATES = join(MLCL_ROOT, 'templates/apps')

/** Every flagship copy of the scaffold guard, plus the standard React source. */
function guardSources(): string[] {
  const flagshipGuards = readdirSync(APP_TEMPLATES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(APP_TEMPLATES, entry.name, 'app/src/components/AuthGuard.tsx'))
    .filter((path) => existsSync(path))
  expect(flagshipGuards.length).toBeGreaterThan(100)
  return [APP_GUARD, ...flagshipGuards]
}

describe('scaffold AuthGuard restore guidance', () => {
  it('puts the shared guard and its route/in-page contract where every app starts', () => {
    for (const path of guardSources()) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).toContain('@molecule/app-ui-react')
      expect(source, path).toContain('<Route element={<AuthGuard />}>')
      expect(source, path).toContain('<AuthGuard><SignedInSection /></AuthGuard>')
      expect(source, path).toContain("status === 'loading'")
      expect(source, path).toContain("status === 'unauthenticated'")
      expect(source, path).toContain("'unavailable'")
      expect(source, path).toContain('public sections')
      expect(source, path).toContain('router navigation')
    }
  })
})
