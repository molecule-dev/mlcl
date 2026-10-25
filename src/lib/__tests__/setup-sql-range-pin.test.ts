/**
 * A project's RANGE pin is bound to one schema version, or refused (P18 r11
 * review, R11-6).
 *
 * A range is not "unknown": `^2.0.0` names the versions the app accepts. The
 * injector used to treat any non-exact pin as unpinned and read the NEAREST copy,
 * so a project pinned `^2.0.0` beside an installed 1.0.0 wrote 1.0.0's schema
 * with no warning and the app then ran 2.x code beside it. A range now binds to
 * the copy it selects (the version the app runs today), else to the registry pin
 * when that is inside it — and is refused, naming what was found, when nothing
 * available satisfies it. A spec that names no evaluable version (`file:`,
 * `workspace:*`, a dist-tag) stays unbound, which is the pre-existing
 * nearest-copy contract for a project that chose where its bytes come from.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isVersionRange, satisfiesVersionRange } from '../exact-version.js'
import { bindIntendedVersion } from '../setup-sql.js'

const PKG = '@molecule/api-probe-range'

describe('satisfiesVersionRange', () => {
  it.each([
    ['^2.0.0', '2.0.0', true],
    ['^2.0.0', '2.9.9', true],
    ['^2.0.0', '3.0.0', false],
    ['^2.0.0', '1.9.9', false],
    ['^0.2.3', '0.2.9', true],
    ['^0.2.3', '0.3.0', false],
    ['^0.0.3', '0.0.4', false],
    ['~1.2.3', '1.2.9', true],
    ['~1.2.3', '1.3.0', false],
    ['1.x', '1.4.0', true],
    ['1.x', '2.0.0', false],
    ['1.2.x', '1.2.7', true],
    ['1.2.x', '1.3.0', false],
    ['1', '1.9.0', true],
    ['1', '2.0.0', false],
    ['>=1.2.0 <2.0.0', '1.5.0', true],
    ['>=1.2.0 <2.0.0', '2.0.0', false],
    ['*', '9.9.9', true],
    ['1.2.3 - 2.0.0', '1.9.0', true],
    ['1.2.3 - 2.0.0', '2.0.1', false],
    ['^1.0.0 || ^2.0.0', '2.3.0', true],
    ['^1.0.0 || ^2.0.0', '3.0.0', false],
    // npm excludes prereleases from a range: they only bind exactly.
    ['^1.0.0', '1.2.0-rc.1', false],
  ])('%s accepts %s → %s', (range, version, expected) => {
    expect(satisfiesVersionRange(range, version)).toBe(expected)
  })

  it('does not treat a tag, a path or a protocol spec as a range', () => {
    for (const spec of [
      'latest',
      'next',
      'file:../pkg',
      'workspace:*',
      'git+https://x/y.git',
      '1.0.4',
    ])
      expect(isVersionRange(spec)).toBe(false)
    expect(satisfiesVersionRange('latest', '1.0.0')).toBe(false)
  })
})

describe('bindIntendedVersion', () => {
  let base: string
  let project: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'mlcl-range-pin-'))
    project = join(base, 'proj')
    mkdirSync(project, { recursive: true })
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  /**
   * Install a copy of the probe package at `version` beside the project.
   *
   * @param version - The version its own manifest declares.
   */
  function installCopy(version: string): void {
    const root = join(base, 'node_modules', PKG)
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: PKG, version }))
  }

  it('binds an exact pin to itself', () => {
    expect(bindIntendedVersion({ packageName: PKG, pin: '2.0.0', projectPath: project })).toEqual({
      kind: 'bound',
      version: '2.0.0',
      via: 'exact',
    })
  })

  it('leaves a project with no pin unbound (nearest-copy contract, unchanged)', () => {
    expect(bindIntendedVersion({ packageName: PKG, pin: undefined, projectPath: project })).toEqual(
      {
        kind: 'unbound',
      },
    )
  })

  it('leaves a file:/workspace:/tag spec unbound', () => {
    for (const pin of ['file:../pkg', 'workspace:*', 'latest', 'git+https://x/y.git'])
      expect(bindIntendedVersion({ packageName: PKG, pin, projectPath: project })).toEqual({
        kind: 'unbound',
      })
  })

  it('binds a range to the installed copy it selects (the satisfied case that must keep working)', () => {
    installCopy('1.0.0')
    expect(bindIntendedVersion({ packageName: PKG, pin: '^1.0.0', projectPath: project })).toEqual({
      kind: 'bound',
      version: '1.0.0',
      via: 'copy',
    })
  })

  it('prefers the nearest satisfying copy when an unsatisfying one is closer', () => {
    installCopy('2.4.0')
    const inner = join(project, 'node_modules', PKG)
    mkdirSync(inner, { recursive: true })
    writeFileSync(join(inner, 'package.json'), JSON.stringify({ name: PKG, version: '1.0.0' }))
    expect(bindIntendedVersion({ packageName: PKG, pin: '^2.0.0', projectPath: project })).toEqual({
      kind: 'bound',
      version: '2.4.0',
      via: 'copy',
    })
  })

  it('binds to the registry pin when the installed copy is outside the range', () => {
    installCopy('1.0.0')
    expect(
      bindIntendedVersion({
        packageName: PKG,
        pin: '^2.0.0',
        projectPath: project,
        registryPin: '2.0.0',
      }),
    ).toEqual({ kind: 'bound', version: '2.0.0', via: 'registry' })
  })

  it('refuses a range nothing satisfies, naming the range, the copies and the registry pin', () => {
    installCopy('1.0.0')
    const binding = bindIntendedVersion({
      packageName: PKG,
      pin: '^2.0.0',
      projectPath: project,
      registryPin: '1.5.0',
    })
    expect(binding.kind).toBe('refused')
    if (binding.kind !== 'refused') throw new Error('expected a refusal')
    expect(binding.message).toContain('"^2.0.0"')
    expect(binding.message).toContain('installed: 1.0.0')
    expect(binding.message).toContain(`${PKG}@1.5.0`)
    expect(binding.message).toContain('npm install')
  })

  it('refuses a range with no copy at all and no registry pin', () => {
    const binding = bindIntendedVersion({ packageName: PKG, pin: '^2.0.0', projectPath: project })
    expect(binding.kind).toBe('refused')
    if (binding.kind !== 'refused') throw new Error('expected a refusal')
    expect(binding.message).toContain('no copy of it is installed')
    expect(binding.message).toContain('registry.json pins no version')
  })
})
