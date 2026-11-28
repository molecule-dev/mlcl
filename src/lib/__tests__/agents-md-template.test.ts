/**
 * The scaffold's AGENTS.md is the conventions file every coding agent reads on
 * open (`ensureAgentsMd` writes `templates/shared/AGENTS.md.tpl` into the
 * project root).
 *
 * Scaffolds used to ship generated mock suites (`api/src/__tests__/routes.test.ts`,
 * `server.test.ts`, `app/src/__tests__/bonds.test.ts`) that pinned the starter's routes, and
 * AGENTS.md carried an exception telling agents to rewrite or delete them. Scaffolds no longer
 * write them (harness smoke run 4, 2026-11-28), so the file states one rule for shipped tests
 * and says how to exercise a change instead.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { extractBondName } from '../injector.js'
import { loadRegistry } from '../registry.js'

const TEMPLATE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../templates/shared/AGENTS.md.tpl',
)

const tpl = readFileSync(TEMPLATE, 'utf-8')

describe('scaffolded AGENTS.md on tests', () => {
  it('still forbids deleting a shipped test by default', () => {
    expect(tpl).toContain('The tests that came with the template are the app')
    expect(tpl).toContain('do not edit, invert or delete the')
    expect(tpl).toContain('Preserve shipped behavior tests.')
  })

  it('names no generated test files or their banner', () => {
    expect(tpl).not.toMatch(/GENERATED SCAFFOLDING|generated smoke tests|routes\.test\.ts/)
  })

  it('says how to exercise a changed route and a changed screen', () => {
    expect(tpl).toContain('Exercise changed API routes over HTTP and changed screens')
    expect(tpl).toContain('check --steps serve --ready <url> --run')
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
