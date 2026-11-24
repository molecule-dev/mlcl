/**
 * When `mlcl inject` may skip its deferred `npm install`: only when nothing an install reads changed
 * and every declared pin is already installed (harness eval `add`, 2026-11-24: the inject half of
 * `mlcl add --inject` re-ran an install that had nothing to do).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installedAsDeclared, installInputs } from '../install-needed.js'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function project(manifest: Record<string, unknown>, installed: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-install-needed-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest))
  for (const [name, version] of Object.entries(installed)) {
    mkdirSync(join(dir, 'node_modules', name), { recursive: true })
    writeFileSync(
      join(dir, 'node_modules', name, 'package.json'),
      JSON.stringify({ name, version }),
    )
  }
  return dir
}

describe('installedAsDeclared', () => {
  it('holds when every exact pin is installed at that version', () => {
    const dir = project(
      {
        dependencies: { '@molecule/api-uploads': '1.2.0' },
        devDependencies: { typescript: '6.0.3' },
      },
      { '@molecule/api-uploads': '1.2.0', typescript: '6.0.3' },
    )
    expect(installedAsDeclared(dir)).toBe(true)
  })

  it('fails on a missing copy, another version, a range or an optional dependency', () => {
    expect(installedAsDeclared(project({ dependencies: { express: '5.3.0' } }, {}))).toBe(false)
    expect(
      installedAsDeclared(project({ dependencies: { express: '5.3.0' } }, { express: '5.2.0' })),
    ).toBe(false)
    expect(
      installedAsDeclared(project({ dependencies: { express: '^5.3.0' } }, { express: '5.3.0' })),
    ).toBe(false)
    expect(installedAsDeclared(project({ optionalDependencies: { fsevents: '2.3.3' } }, {}))).toBe(
      false,
    )
  })

  it('reads the workspace root too, and resolves hoisted copies from it', () => {
    const root = project(
      { workspaces: ['api'], devDependencies: { prettier: '3.6.2' } },
      { prettier: '3.6.2', express: '5.3.0' },
    )
    mkdirSync(join(root, 'api'))
    writeFileSync(
      join(root, 'api', 'package.json'),
      JSON.stringify({ dependencies: { express: '5.3.0' } }),
    )
    expect(installedAsDeclared(join(root, 'api'))).toBe(true)
    rmSync(join(root, 'node_modules', 'prettier'), { recursive: true })
    expect(installedAsDeclared(join(root, 'api'))).toBe(false)
  })
})

describe('installInputs', () => {
  it('changes with a dependency and not with other fields', () => {
    const dir = project({ name: 'a', dependencies: { express: '5.3.0' } }, {})
    const before = installInputs(dir)
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'b', dependencies: { express: '5.3.0' } }),
    )
    expect(installInputs(dir)).toBe(before)
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'b', dependencies: { express: '5.3.0', uuid: '14.0.3' } }),
    )
    expect(installInputs(dir)).not.toBe(before)
  })
})
