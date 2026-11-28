/**
 * The pre-commit check that the staged `registry.json` passes the intent-hint rules, including
 * the declarations in `pendingPackages` that a release later moves into the catalog.
 *
 * @module
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { intentHintReport } from '../intent-hints.js'
import { Registry } from '../schema.js'

const root = join(import.meta.dirname, '..', '..', '..')
let repo: string

const git = (...args: string[]): string =>
  execFileSync(
    'git',
    ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args],
    { encoding: 'utf8' },
  )

/** A utility entry, like the internal React kit that reached a release without hints. */
const utility = {
  type: 'utility',
  category: 'ui',
  label: 'Probe kit',
  description: 'Component trees two probe packages share.',
  stack: 'app',
  exports: [],
  runtimeDependencies: [],
  moleculePeers: [],
  path: 'packages/app/utilities/probe-kit',
}

/**
 * Stages a registry holding `entry` as a pending declaration and runs the check against it.
 *
 * @param entry - The pending entry.
 * @param staged - Whether to stage the registry (false leaves only the working-tree copy).
 * @returns The exit status and the combined output.
 */
function stageAndCheck(entry: object, staged = true): { status: number | null; output: string } {
  const registry = {
    version: 1,
    packages: {},
    pendingPackages: { '@molecule/app-probe-kit': entry },
    moleculeVersions: { default: '1.0.0', overrides: {} },
  }
  writeFileSync(join(repo, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`)
  if (staged) git('add', 'registry.json')
  const run = spawnSync(
    process.execPath,
    ['--import', 'tsx', join(root, 'scripts', 'check-registry-intent-hints.mjs'), `--repo=${repo}`],
    { cwd: root, encoding: 'utf8' },
  )
  return { status: run.status, output: `${run.stdout}${run.stderr}` }
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'mlcl-registry-intent-hints-'))
  git('init', '-q')
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

describe('check-registry-intent-hints', () => {
  it('refuses a pending declaration no intent can find, naming it and the fix', () => {
    const result = stageAndCheck(utility)
    expect(result.status).toBe(1)
    expect(result.output).toContain('✗ @molecule/app-probe-kit: no intentHints')
    expect(result.output).toContain('`ui.hidden`')
  })

  it('passes the same declaration once it is hidden or hinted', () => {
    expect(stageAndCheck({ ...utility, ui: { hidden: true } }).status).toBe(0)
    expect(stageAndCheck({ ...utility, intentHints: ['probe kit'] }).status).toBe(0)
  })

  it('refuses more than 8 hints and a hint outside the pattern', () => {
    const many = stageAndCheck({
      ...utility,
      intentHints: Array.from({ length: 9 }, (_, i) => `probe ${i}`),
    })
    expect(many.status).toBe(1)
    expect(many.output).toContain('9 hints (cap is 8)')
    const invalid = stageAndCheck({ ...utility, intentHints: ['Probe Kit'] })
    expect(invalid.status).toBe(1)
    expect(invalid.output).toContain('invalid hint "Probe Kit"')
  })

  it('judges the staged registry, not the working tree', () => {
    stageAndCheck({ ...utility, ui: { hidden: true } })
    // The working tree now breaks the rule, but the index still holds the hidden entry.
    expect(stageAndCheck(utility, false).status).toBe(0)
  })

  it('refuses when nothing is staged', () => {
    const result = stageAndCheck(utility, false)
    expect(result.status).toBe(1)
    expect(result.output).toContain('cannot read the staged registry.json')
  })
})

describe('intentHintReport', () => {
  it('lets the framework counterparts of one feature share a hint, but not two unrelated packages', () => {
    const entry = (name: string, framework: string): object => ({
      type: 'feature',
      category: 'probe',
      label: name,
      description: name,
      stack: 'app',
      path: `packages/app/features/${name}`,
      runtimeDependencies: [framework],
      intentHints: ['probe feature'],
    })
    const appFrameworks = {
      react: { label: 'React', dependencies: { react: '19.2.4' } },
      vue: { label: 'Vue', dependencies: { vue: '3.5.0' } },
    }
    const counterparts = intentHintReport(
      Registry.parse({
        version: 1,
        packages: {
          '@molecule/app-probe-react': entry('probe-react', 'react'),
          '@molecule/app-probe-vue': entry('probe-vue', 'vue'),
        },
        appFrameworks,
      }),
    )
    expect(counterparts.violations).toEqual([])
    const unrelated = intentHintReport(
      Registry.parse({
        version: 1,
        packages: {
          '@molecule/app-probe-react': entry('probe-react', 'react'),
          '@molecule/app-other-react': entry('other-react', 'react'),
        },
        appFrameworks,
      }),
    )
    expect(unrelated.violations).toEqual([
      {
        subject: 'duplicate hint "probe feature"',
        message: 'carried by @molecule/app-probe-react, @molecule/app-other-react',
      },
    ])
  })
})
