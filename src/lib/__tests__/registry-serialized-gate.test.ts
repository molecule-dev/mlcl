/**
 * The pre-commit check that the staged `registry.json` is stored exactly as `serializeRegistry`
 * writes it, including the declarations in `pendingPackages` that a release later moves into the
 * catalog as they are.
 *
 * @module
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { serializeRegistry } from '../registry.js'

const root = join(import.meta.dirname, '..', '..', '..')
let repo: string

const git = (...args: string[]): string =>
  execFileSync(
    'git',
    ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args],
    {
      encoding: 'utf8',
    },
  )

/** A feature entry whose keys follow the schema's order. */
const entry = {
  type: 'feature',
  category: 'probe',
  label: 'Probe',
  description: 'The probe feature',
  stack: 'app',
  exports: [],
  runtimeDependencies: [],
  moleculePeers: [],
  path: 'packages/app/features/probe-react',
  intentHints: ['probe'],
}

/**
 * The registry around one probe entry.
 *
 * @param section - Where the entry sits.
 * @param probe - The entry, in the key order to store.
 * @returns The registry object.
 */
function registry(section: 'packages' | 'pendingPackages', probe: object): object {
  return {
    version: 1,
    packages: section === 'packages' ? { '@molecule/app-probe-react': probe } : {},
    ...(section === 'pendingPackages'
      ? { pendingPackages: { '@molecule/app-probe-react': probe } }
      : {}),
    moleculeVersions: { default: '1.0.0', overrides: {} },
  }
}

/**
 * Stages `text` as registry.json in the fixture repo and runs the check against it.
 *
 * @param text - The registry bytes to stage.
 * @returns The exit status and the combined output.
 */
function stageAndCheck(text: string): { status: number | null; output: string } {
  writeFileSync(join(repo, 'registry.json'), text)
  git('add', 'registry.json')
  const run = spawnSync(
    process.execPath,
    ['--import', 'tsx', join(root, 'scripts', 'check-registry-serialized.mjs'), `--repo=${repo}`],
    { cwd: root, encoding: 'utf8' },
  )
  return { status: run.status, output: `${run.stdout}${run.stderr}` }
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'mlcl-registry-serialized-'))
  git('init', '-q')
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

describe('check-registry-serialized', () => {
  it('passes a registry stored as serializeRegistry writes it', () => {
    const result = stageAndCheck(serializeRegistry(registry('packages', entry)))
    expect(result.output).toBe('')
    expect(result.status).toBe(0)
  })

  it('refuses a pending declaration whose keys are out of schema order, naming it', () => {
    // f5341d7ac9's shape: intentHints written right after description, where the schema puts it after path.
    const { type, category, label, description, intentHints, ...rest } = entry
    const handWritten = { type, category, label, description, intentHints, ...rest }
    const result = stageAndCheck(
      `${JSON.stringify(registry('pendingPackages', handWritten), null, 2)}\n`,
    )
    expect(result.status).toBe(1)
    expect(result.output).toContain('pendingPackages.@molecule/app-probe-react')
    expect(result.output).toContain('sync-registry --scan-exports')
  })

  it('refuses a catalog entry out of schema order', () => {
    const { path, ...rest } = entry
    const result = stageAndCheck(
      `${JSON.stringify(registry('packages', { path, ...rest }), null, 2)}\n`,
    )
    expect(result.status).toBe(1)
    expect(result.output).toContain('packages.@molecule/app-probe-react')
  })

  it('reads the staged bytes, not the working tree', () => {
    stageAndCheck(serializeRegistry(registry('packages', entry)))
    const { path, ...rest } = entry
    writeFileSync(
      join(repo, 'registry.json'),
      JSON.stringify(registry('packages', { path, ...rest })),
    )
    const run = spawnSync(
      process.execPath,
      ['--import', 'tsx', join(root, 'scripts', 'check-registry-serialized.mjs'), `--repo=${repo}`],
      { cwd: root, encoding: 'utf8' },
    )
    expect(run.status).toBe(0)
  })
})
