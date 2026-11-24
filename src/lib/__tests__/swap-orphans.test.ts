/**
 * `mlcl swap` removes the libraries only the replaced provider used: inject declares a provider's
 * own dependencies in the app (`pg` for PostgreSQL, `connect-busboy` for the Express body parser),
 * and a swap used to leave them declared and installed for good.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { dropReplacedProviderDependencies } from '../swap-orphans.js'

const OLD = '@molecule/api-database-postgresql'
const NEW = '@molecule/api-database-mysql'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A project after the swap rewrote its pin, with the old provider still installed. */
function swapped(manifest: Record<string, unknown>, files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-swap-orphans-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest))
  const installed = {
    [OLD]: { pg: '8.16.3', 'pg-cursor': '2.15.3', '@molecule/api-bond': '1.0.4' },
    '@molecule/api-other': { 'pg-cursor': '2.15.3' },
  }
  for (const [name, dependencies] of Object.entries(installed)) {
    mkdirSync(join(dir, 'node_modules', name), { recursive: true })
    writeFileSync(
      join(dir, 'node_modules', name, 'package.json'),
      JSON.stringify({ name, dependencies }),
    )
  }
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(join(dir, file, '..'), { recursive: true })
    writeFileSync(join(dir, file), text)
  }
  return dir
}

const declared = (dir: string): string[] => {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).sort()
}

describe('dropReplacedProviderDependencies', () => {
  it('removes a library only the replaced provider used (OLD MUSTFAIL)', () => {
    const dir = swapped(
      { dependencies: { [NEW]: '1.0.0', pg: '8.16.3', express: '5.3.0' } },
      { 'src/server.ts': "import express from 'express'\n" },
    )
    expect(dropReplacedProviderDependencies(dir, OLD, NEW)).toEqual(['pg'])
    expect(declared(dir)).toEqual([NEW, 'express'])
  })

  it('keeps what the app imports or runs, or another declared package depends on', () => {
    const imported = swapped(
      { dependencies: { [NEW]: '1.0.0', pg: '8.16.3' } },
      { 'src/scripts/report.ts': "const { Pool } = await import('pg/lib/index.js')\n" },
    )
    expect(dropReplacedProviderDependencies(imported, OLD, NEW)).toEqual([])
    const run = swapped({
      scripts: { dump: 'pg dump' },
      dependencies: { [NEW]: '1.0.0', pg: '8.16.3' },
    })
    expect(dropReplacedProviderDependencies(run, OLD, NEW)).toEqual([])
    const shared = swapped({
      dependencies: { [NEW]: '1.0.0', '@molecule/api-other': '1.0.0', 'pg-cursor': '2.15.3' },
    })
    expect(dropReplacedProviderDependencies(shared, OLD, NEW)).toEqual([])
  })

  it('counterexample: a script word that only contains the name does not keep it', () => {
    const dir = swapped({
      scripts: { 'db:upgrade': 'tsx src/upgrade.ts' },
      dependencies: { [NEW]: '1.0.0', pg: '8.16.3' },
    })
    expect(dropReplacedProviderDependencies(dir, OLD, NEW)).toEqual(['pg'])
  })

  // A swap keeps the replaced provider pinned when a package the app keeps still requires it
  // (`api-bonds-default-express` imports its database providers): it stays installed, and so do
  // the libraries it depends on.
  it('keeps the libraries of a replaced provider the manifest still declares', () => {
    const dir = swapped({ dependencies: { [NEW]: '1.0.0', [OLD]: '1.0.0', pg: '8.16.3' } })
    expect(dropReplacedProviderDependencies(dir, OLD, NEW)).toEqual([])
    expect(declared(dir)).toEqual([OLD, NEW, 'pg'].sort())
  })

  it('changes nothing when the replaced provider is not installed here', () => {
    const dir = swapped({ dependencies: { [NEW]: '1.0.0', pg: '8.16.3' } })
    rmSync(join(dir, 'node_modules', OLD), { recursive: true })
    expect(dropReplacedProviderDependencies(dir, OLD, NEW)).toEqual([])
    expect(declared(dir)).toEqual([NEW, 'pg'])
  })
})
