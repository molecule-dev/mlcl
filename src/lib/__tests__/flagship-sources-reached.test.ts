/**
 * Every source file of a flagship app is part of its build.
 *
 * On 2026-11-24, 1,667 of the flagships' app source files were reached by nothing their build
 * loads: 949 bond files beside a `setupAllDefaultBonds()` that already wires those providers, 386
 * components older pages used, a `src/service-worker.ts` in all 150 apps (the PWA is built by
 * Workbox `generateSW`, which never reads it), the old nested `src/locales/en.ts` in 136, and
 * pages no route renders (a regression test even guarded one of them while the routed page went
 * untested). A coding agent that starts from a template reads and edits such a file for nothing,
 * a re-run of `mlcl inject` wires providers into it, and every build of the app warns
 * `[molecule:unreached-source]` for each one. Reachability follows the build's own inputs: the
 * modules `index.html` loads, the Vite config and build scripts, relative imports and
 * `import.meta.glob` patterns (see helpers/source-reach.ts).
 *
 * @module
 */
import { cpSync, existsSync, readdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { unreachedSources } from './helpers/source-reach.js'

const APPS = join(import.meta.dirname, '..', '..', '..', 'templates', 'apps')

/** The flagships with a Vite app: an `index.html` beside their `src/`. */
const FLAGSHIPS = readdirSync(APPS).filter(
  (slug) =>
    existsSync(join(APPS, slug, 'app', 'index.html')) && existsSync(join(APPS, slug, 'app', 'src')),
)

describe('every flagship source file is part of its build', () => {
  it('finds the flagships', () => {
    expect(FLAGSHIPS.length).toBeGreaterThan(100)
  })

  it.each(FLAGSHIPS)('%s has no source file its build never reaches', (slug) => {
    expect(unreachedSources(join(APPS, slug, 'app'))).toEqual([])
  })
})

describe('the reachability check (known-bad copies of crm)', () => {
  let copy = ''
  beforeAll(async () => {
    copy = await mkdtemp(join(tmpdir(), 'mlcl-source-reach-'))
    cpSync(join(APPS, 'crm', 'app', 'src'), join(copy, 'src'), { recursive: true })
    cpSync(join(APPS, 'crm', 'app', 'index.html'), join(copy, 'index.html'))
  })
  afterAll(async () => {
    await rm(copy, { recursive: true, force: true })
  })

  it('names a component and a bond file nothing imports', () => {
    writeFileSync(join(copy, 'src', 'components', 'OldCard.tsx'), 'export function OldCard() {}\n')
    writeFileSync(
      join(copy, 'src', 'bonds', 'app-clipboard-web.ts'),
      'export function setup() {}\n',
    )
    expect(unreachedSources(copy)).toEqual([
      'src/bonds/app-clipboard-web.ts',
      'src/components/OldCard.tsx',
    ])
  })

  it('counterexample: the locale files the i18n bond loads by import.meta.glob are reached', () => {
    // crm's i18n bond loads `../locales/*/ui.ts`; none of them is imported by name.
    expect(existsSync(join(copy, 'src', 'locales', 'fr', 'ui.ts'))).toBe(true)
    expect(unreachedSources(copy).filter((file) => file.startsWith('src/locales/'))).toEqual([])
  })
})
