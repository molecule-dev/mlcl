/**
 * A plan's `delete` operation removes a file the plan replaces (the activity-capture module an
 * older mlcl generated, once the project installs the package), and a failed injection puts it
 * back like every other file it touched.
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { executeInjection, type InjectionPlan, writeSynthesizedFiles } from '../injector.js'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-injector-delete-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo-api', dependencies: {} }))
  mkdirSync(join(dir, 'src', 'bonds'), { recursive: true })
  writeFileSync(join(dir, 'src', 'bonds', 'old.ts'), 'export const old = 1\n')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function plan(files: InjectionPlan['files']): InjectionPlan {
  return {
    molecule: '@molecule/test',
    moleculePackage: {
      name: '@molecule/test',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'utility',
      routes: [],
      tables: [],
      exports: [],
      path: '/fake',
    },
    files,
    dependencies: [],
    migrations: [],
    bondSetup: null,
    conflicts: [],
  }
}

describe('delete operations', () => {
  const old = (): string => join(dir, 'src', 'bonds', 'old.ts')

  it('executeInjection removes the file and reports it', async () => {
    const result = await executeInjection(
      plan([{ action: 'delete', targetPath: old(), description: 'replaced' }]),
      dir,
      { autoInstall: false },
    )
    expect(result.errors).toEqual([])
    expect(existsSync(old())).toBe(false)
    expect(result.filesModified).toContain(old())
  })

  it('executeInjection restores the file when a later operation fails', async () => {
    // A target whose parent is a file cannot be written.
    writeFileSync(join(dir, 'blocker'), '')
    const result = await executeInjection(
      plan([
        { action: 'delete', targetPath: old(), description: 'replaced' },
        {
          action: 'create',
          targetPath: join(dir, 'blocker', 'x.ts'),
          content: 'x',
          description: 'x',
        },
      ]),
      dir,
      { autoInstall: false },
    )
    expect(result.errors.length).toBeGreaterThan(0)
    expect(readFileSync(old(), 'utf8')).toBe('export const old = 1\n')
  })

  it('writeSynthesizedFiles removes it, and puts it back when a later write fails', async () => {
    const done = await writeSynthesizedFiles([
      { action: 'delete', targetPath: old(), description: 'replaced' },
    ])
    expect(done.error).toBeNull()
    expect(done.written).toEqual([old()])
    expect(existsSync(old())).toBe(false)

    writeFileSync(old(), 'export const old = 1\n')
    writeFileSync(join(dir, 'blocker'), '')
    const failed = await writeSynthesizedFiles([
      { action: 'delete', targetPath: old(), description: 'replaced' },
      {
        action: 'create',
        targetPath: join(dir, 'blocker', 'x.ts'),
        content: 'x',
        description: 'x',
      },
    ])
    expect(failed.error).toMatch(/Failed to write/)
    expect(readFileSync(old(), 'utf8')).toBe('export const old = 1\n')
  })

  // Counterexample: nothing to delete is not an error and reports nothing.
  it('skips a file that is already gone', async () => {
    rmSync(old())
    const result = await executeInjection(
      plan([{ action: 'delete', targetPath: old(), description: 'replaced' }]),
      dir,
      { autoInstall: false },
    )
    expect(result.errors).toEqual([])
    expect(result.filesModified).toEqual([])
  })
})
