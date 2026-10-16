/**
 * The scaffold's AGENTS.md is the conventions file every coding agent reads on
 * open (`ensureAgentsMd` writes `templates/shared/AGENTS.md.tpl` into the
 * project root).
 *
 * Two of its statements point opposite ways on the scaffold's generated smoke
 * tests. The general rule — "The tests that came with the template are the
 * app's rules … do not edit, invert or delete the test to match what you built"
 * — is exactly what made an executor hand-repair the STARTER's expectations in
 * `api/src/__tests__/routes.test.ts` instead of deleting a file its app had
 * outgrown (X1 flash-m53: three reads and two edit rounds from +02:11 to +04:42,
 * 2,600 lines). The exception has to be in the same place, naming those files
 * and their banner, or the agent reads the rule and repairs.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { GENERATED_TEST_MARKER } from '../injector.js'

const TEMPLATE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../templates/shared/AGENTS.md.tpl',
)

const tpl = readFileSync(TEMPLATE, 'utf-8')

describe('scaffolded AGENTS.md on the generated smoke tests', () => {
  it('still forbids deleting a shipped test by default', () => {
    expect(tpl).toContain('The tests that came with the template are the app')
    expect(tpl).toContain('do not edit, invert or delete the')
  })

  it('names the generated smoke tests as the exception, by path and by banner', () => {
    expect(tpl, "the route smoke test's path").toContain('api/src/__tests__/routes.test.ts')
    expect(tpl, "the server smoke test's path").toContain('api/src/__tests__/server.test.ts')
    // The marker is the injector's own constant — the phrase the file really
    // opens with. A template carrying a stale literal would send the agent
    // looking for a line that is not there.
    expect(tpl, 'the marker the generated files open with').toContain(GENERATED_TEST_MARKER)
  })

  it('says rewriting or deleting them is allowed', () => {
    const exception = tpl.slice(tpl.indexOf('The exception is the scaffold'))
    expect(exception.length, 'the exception must be present, not just the rule').toBeGreaterThan(0)
    expect(exception).toMatch(/Rewrite them for your own routes or delete them/)
  })
})
