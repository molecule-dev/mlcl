/**
 * `mlcl create .` scaffolds into the current directory, as `npm init` and `create-vite .` do.
 * On 2026-11-22 a Codex smoke run in an empty git repo ran `mlcl create . --type full-stack …`,
 * was refused with "Invalid project name", and had to retry with `"$PWD"`. The current
 * directory's own name is then the project name, under the same slug rule as any other name.
 *
 * Runs the REAL oclif command against a temp directory.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl create . (the current directory)', () => {
  let root: string
  let prevCwd: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mlcl-create-here-'))
    prevCwd = process.cwd()
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(root, { recursive: true, force: true })
  })

  /** An empty repo named `dirName`, as `git init` leaves it, made the working directory. */
  function enter(dirName: string): string {
    const dir = join(root, dirName)
    mkdirSync(join(dir, '.git'), { recursive: true })
    process.chdir(dir)
    return dir
  }

  async function create(name: string): Promise<void> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create([name, '--template', 'blog', '--skip-install'], config)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
  }

  it.each(['.', './'])('scaffolds "%s" into the directory itself, named after it', async (name) => {
    const dir = enter('tool-shed')
    await create(name)
    expect(existsSync(join(dir, 'api', 'package.json'))).toBe(true)
    expect(existsSync(join(dir, 'app', 'package.json'))).toBe(true)
    expect(existsSync(join(dir, 'tool-shed'))).toBe(false)
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name).toBe('tool-shed')
  })

  it('refuses "." in a directory whose name is not a slug, naming that directory', async () => {
    enter('Tool Shed')
    await expect(create('.')).rejects.toThrow(/Invalid project name "\. \(Tool Shed\)"/)
  })

  it('still refuses a name that climbs out of the working directory', async () => {
    enter('tool-shed')
    await expect(create('../elsewhere')).rejects.toThrow(/Invalid project name "\.\.\/elsewhere"/)
  })
})
