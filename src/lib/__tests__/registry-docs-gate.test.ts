/**
 * The mlcl pre-commit check (`scripts/check-registry-docs.mjs`) that refuses a registry.json
 * commit leaving a committed molecule README stale.
 *
 * A README is generated from the package's molecule source and its mlcl registry entry. On
 * 2026-11-22 `@molecule/app-locales-node-editor-panel` entered the registry, which gives the
 * feature's README a Translations section, and the feature's README stayed stale for two hours
 * until the release's docs gate refused the release. These cases build that shape in a scratch
 * molecule/mlcl pair.
 *
 * @module
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const featurePath = 'packages/app/features/docs-probe-panel'
const feature = '@molecule/app-docs-probe-panel'
const locale = '@molecule/app-locales-docs-probe-panel'
let scratch: string
let molecule: string
let mlcl: string

const git = (dir: string, ...args: string[]): string =>
  execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], {
    encoding: 'utf8',
  })

function registry(extra: { locale?: boolean; pins?: Record<string, string> } = {}): string {
  const packages: Record<string, unknown> = {
    [feature]: {
      type: 'feature',
      category: 'docs-probe-panel',
      stack: 'app',
      label: 'Docs probe panel',
      description: 'A probe panel',
      path: featurePath,
      exports: ['probe'],
      moleculePeers: [],
      runtimeDependencies: [],
    },
  }
  if (extra.locale)
    packages[locale] = {
      type: 'locales',
      category: 'locales',
      stack: 'app',
      label: 'Docs probe panel locales',
      description: 'Translations for the probe panel',
      path: 'packages/app/locales/docs-probe-panel',
      exports: [],
      moleculePeers: [],
      runtimeDependencies: [],
    }
  return `${JSON.stringify({ version: 1, packages, moleculeVersions: { default: '1.0.0', overrides: extra.pins ?? {} } }, null, 2)}\n`
}

/** Regenerate the feature's README in the scratch molecule from `registryText`, and commit it. */
function commitReadme(registryText: string): void {
  const file = join(scratch, 'regen-registry.json')
  writeFileSync(file, registryText)
  execFileSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/regen-molecule-docs.mjs', featurePath],
    {
      cwd: root,
      env: {
        ...process.env,
        MOLECULE_PACKAGES_DIR: join(molecule, 'packages'),
        MLCL_REGISTRY_PATH: file,
      },
      stdio: 'pipe',
      timeout: 60_000,
    },
  )
  git(molecule, 'add', '-A')
  git(molecule, 'commit', '-qm', 'readme')
}

/** Stage `registryText` as mlcl's registry.json and run the check. */
function stageAndCheck(registryText: string): { status: number | null; output: string } {
  writeFileSync(join(mlcl, 'registry.json'), registryText)
  git(mlcl, 'add', 'registry.json')
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/check-registry-docs.mjs',
      `--repo=${mlcl}`,
      `--molecule=${molecule}`,
    ],
    { cwd: root, encoding: 'utf8', timeout: 120_000 },
  )
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-docs-'))
  molecule = join(scratch, 'molecule')
  mlcl = join(scratch, 'mlcl')
  mkdirSync(join(molecule, featurePath, 'src'), { recursive: true })
  mkdirSync(mlcl)
  writeFileSync(join(molecule, 'package.json'), '{ "name": "molecule-fixture", "private": true }\n')
  writeFileSync(
    join(molecule, featurePath, 'package.json'),
    `${JSON.stringify({ name: feature, version: '1.0.0', description: 'A probe panel' }, null, 2)}\n`,
  )
  writeFileSync(
    join(molecule, featurePath, 'src/index.ts'),
    '/**\n * A probe panel.\n *\n * @module\n */\n\n/** A probe. */\nexport const probe = 1\n',
  )
  git(molecule, 'init', '-q')
  git(mlcl, 'init', '-q')
  writeFileSync(join(mlcl, 'registry.json'), registry())
  git(mlcl, 'add', 'registry.json')
  git(mlcl, 'commit', '-qm', 'registry')
  commitReadme(registry())
  // The README regeneration runs tsx in a child process: seconds alone, longer on a loaded
  // machine, and vitest's default hook timeout is 10 s (2026-11-22: three cases timed out here).
}, 120_000)

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

const leftovers = (): string[] =>
  readdirSync(scratch).filter((name) => name.startsWith('.precommit-'))

describe('registry docs gate', () => {
  it('refuses a new locale entry while molecule HEAD carries the feature README without it', () => {
    const result = stageAndCheck(registry({ locale: true }))
    expect(result.status).toBe(1)
    expect(result.output).toContain('molecule HEAD does not match yet')
    expect(result.output).toContain(`${featurePath}/README.md`)
    expect(result.output).toContain(`scripts/regen-molecule-docs.mjs ${featurePath}`)
    expect(leftovers()).toEqual([])
  }, 180_000)

  it('passes once the regenerated README is committed in molecule', () => {
    commitReadme(registry({ locale: true }))
    const result = stageAndCheck(registry({ locale: true }))
    expect(result.output).toContain('1 package README(s) at molecule HEAD match')
    expect(result.status).toBe(0)
    expect(leftovers()).toEqual([])
  }, 180_000)

  it('refuses a removed locale entry by the base registry relations', () => {
    commitReadme(registry({ locale: true }))
    writeFileSync(join(mlcl, 'registry.json'), registry({ locale: true }))
    git(mlcl, 'commit', '-qam', 'locale')
    const result = stageAndCheck(registry())
    expect(result.status).toBe(1)
    expect(result.output).toContain(`${featurePath}/README.md`)
  }, 180_000)

  it('checks nothing and exports nothing for a version-pin edit', () => {
    const result = stageAndCheck(registry({ pins: { [feature]: '1.0.1' } }))
    expect(result).toEqual({ status: 0, output: '' })
    expect(leftovers()).toEqual([])
  }, 180_000)

  it('skips a standalone clone with no molecule checkout', () => {
    rmSync(join(molecule, '.git'), { recursive: true, force: true })
    const result = stageAndCheck(registry({ locale: true }))
    expect(result.status).toBe(0)
    expect(result.output).toContain('no molecule checkout')
    expect(existsSync(join(molecule, featurePath, 'README.md'))).toBe(true)
  }, 180_000)
})
