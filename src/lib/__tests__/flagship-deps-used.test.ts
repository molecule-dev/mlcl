/**
 * Every `@molecule/*` dependency a flagship declares is used.
 *
 * On 2026-11-25, 211 of the flagships' api and app halves declared 690 `@molecule/*` dependencies
 * that nothing in them imports: `app-service-worker-default` in all 150 apps (only the removed
 * `src/service-worker.ts` used it), shell, header and sidebar layouts the app's own layout
 * replaced, a second plan-updated page beside the legal-pages one each app routes, and providers
 * no bond file wires (crm: seven). An app started from a template installed each of them, with
 * its own dependencies, and a coding agent reading package.json took them for capabilities the
 * app has. See helpers/unused-molecule-deps.ts for what counts as a use.
 *
 * @module
 */
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { unusedMoleculeDependencies } from './helpers/unused-molecule-deps.js'

const MLCL = join(import.meta.dirname, '..', '..', '..')
const APPS = join(MLCL, 'templates', 'apps')
const registry = JSON.parse(readFileSync(join(MLCL, 'registry.json'), 'utf8')).packages

/** Every flagship half with a package.json, as `<slug>/<api|app>`. */
const HALVES = readdirSync(APPS).flatMap((slug) =>
  ['api', 'app']
    .filter((half) => existsSync(join(APPS, slug, half, 'package.json')))
    .map((half) => `${slug}/${half}`),
)

describe('every @molecule dependency a flagship declares is used', () => {
  it('finds the flagships', () => {
    expect(HALVES.length).toBeGreaterThan(200)
  })

  it.each(HALVES)('%s', (half) => {
    expect(unusedMoleculeDependencies(join(APPS, half), registry)).toEqual([])
  })
})

describe('the check (known-bad copies of crm)', () => {
  let copy = ''
  beforeAll(() => {
    copy = mkdtempSync(join(tmpdir(), 'mlcl-deps-used-'))
    for (const part of ['app', 'e2e'])
      if (existsSync(join(APPS, 'crm', part)))
        cpSync(join(APPS, 'crm', part), join(copy, part), {
          recursive: true,
          filter: (src) => !src.includes('node_modules'),
        })
  })
  afterAll(() => {
    rmSync(copy, { recursive: true, force: true })
  })

  const declare = (name: string): void => {
    const file = join(copy, 'app', 'package.json')
    const manifest = JSON.parse(readFileSync(file, 'utf8'))
    manifest.dependencies[name] = '1.0.0'
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
  }

  it('names a declared package nothing imports', () => {
    declare('@molecule/app-kanban-default')
    expect(unusedMoleculeDependencies(join(copy, 'app'), registry)).toEqual([
      '@molecule/app-kanban-default',
    ])
  })

  it('counterexample: a package a file imports is used', () => {
    writeFileSync(
      join(copy, 'app', 'src', 'Board.tsx'),
      "import { createKanban } from '@molecule/app-kanban-default'\n",
    )
    expect(unusedMoleculeDependencies(join(copy, 'app'), registry)).toEqual([])
  })

  it('counterexample: a package template.json lists is used though no file names it', () => {
    // A scaffold of the template declares it and copies its setup SQL at the pinned version.
    declare('@molecule/app-timeline')
    expect(unusedMoleculeDependencies(join(copy, 'app'), registry)).toContain(
      '@molecule/app-timeline',
    )
    writeFileSync(
      join(copy, 'template.json'),
      JSON.stringify({ packages: ['@molecule/app-timeline'] }),
    )
    expect(unusedMoleculeDependencies(join(copy, 'app'), registry)).not.toContain(
      '@molecule/app-timeline',
    )
    rmSync(join(copy, 'template.json'))
  })

  it('counterexample: a peer of a used package is used though no file names it', () => {
    // crm declares @molecule/app-clipboard-web for @molecule/app-bonds-default-react, which wires it.
    const peer = '@molecule/app-clipboard-web'
    expect(registry['@molecule/app-bonds-default-react'].runtimeDependencies).toContain(peer)
    const manifest = JSON.parse(readFileSync(join(copy, 'app', 'package.json'), 'utf8'))
    expect(Object.keys(manifest.dependencies)).toContain(peer)
    expect(unusedMoleculeDependencies(join(copy, 'app'), registry)).not.toContain(peer)
  })
})
