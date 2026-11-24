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

import { extractBondName, GENERATED_TEST_MARKER } from '../injector.js'
import { loadRegistry } from '../registry.js'

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

// Codex opened `app/src/bonds/auth.ts`, a name it guessed from the category, after reading the
// first 105 lines of an AGENTS.md whose auth entry (`Wired bond: …auth-default.ts`) sat at line
// 145 (harness eval `scaffold`, 2026-11-24). The wiring line near the top names the file shapes,
// and each example is the name the injector really writes.
describe('scaffolded AGENTS.md on the bond file names', () => {
  const wiring = tpl.split('\n').find((line) => line.includes('Provider wiring lives in'))

  it('names the bond files in the lines an agent reads first (OLD MUSTFAIL)', () => {
    expect(tpl.split('\n').indexOf(wiring ?? '')).toBeLessThan(20)
    expect(wiring).toContain('one file per wired package, named after it')
    expect(wiring).toContain('`<category>-default.ts`')
    expect(wiring).toContain('`Wired bond:`')
  })

  it('gives examples the injector and the registry really produce', () => {
    expect(wiring).toContain(`\`${extractBondName('@molecule/api-database-sqlite')}.ts\``)
    expect(wiring).toContain(`\`${extractBondName('@molecule/app-ui-tailwind')}.ts\``)
    const defaults = loadRegistry()
      .map((entry) => (entry.molecule as { defaultBond?: unknown } | undefined)?.defaultBond)
      .filter((name): name is string => typeof name === 'string')
    expect(defaults).toContain('auth-default')
    expect(defaults.every((name) => /^[a-z0-9-]+-default$/.test(name))).toBe(true)
    expect(wiring).toContain('`auth-default.ts`')
  })
})
