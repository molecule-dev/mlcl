/**
 * The README's quick start names the variables each scaffolded `.env` leaves empty, and nothing
 * when there are none. A fixed "fill in credentials in api/.env and app/.env" line sent an agent to
 * inspect a complete `.env` and rewrite the README (harness eval `scaffold`, 2026-11-26).
 *
 * Drives the real oclif command (`--skip-install`, files only) and checks the README against the
 * `.env` files the same scaffold wrote.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-create-readme-env-'))
  prevCwd = process.cwd()
  process.chdir(dir)
})

afterEach(async () => {
  process.chdir(prevCwd)
  await rm(dir, { recursive: true, force: true })
})

/** Run the real command with its output captured instead of printed. */
async function runCreate(argv: string[]): Promise<void> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Create(argv, config)
  vi.spyOn(cmd, 'log').mockImplementation(() => {})
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  await cmd.run()
}

/** The README's quick-start code block. */
function quickStart(projectRoot: string): string {
  const readme = readFileSync(join(projectRoot, 'README.md'), 'utf8')
  const block = /## Quick start\n\n```bash\n([\s\S]*?)```/.exec(readme)
  if (!block) throw new Error('README has no quick-start block')
  return block[1]
}

/** The variables a `.env` file leaves empty. */
function blankVariables(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line) => /^([A-Z][A-Z0-9_]*)=$/.exec(line)?.[1] ?? [])
}

describe('the scaffold README names what the .env files leave empty', () => {
  it('says nothing about the environment when the scaffold set every required value', async () => {
    // OLD MUSTFAIL: the quick start said to fill in credentials, though SQLite's path and the
    // JWT key pair were already written.
    await runCreate([
      'proj',
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-database-sqlite,@molecule/api-resource-user,@molecule/app-auth',
      '--skip-install',
      '--no-interactive',
    ])
    expect(quickStart(join(dir, 'proj'))).toBe('npm install\nnpm run dev\n')
  })

  it('names each variable a package needs, by file', async () => {
    await runCreate([
      'proj',
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-database-sqlite,@molecule/api-payments-stripe',
      '--skip-install',
      '--no-interactive',
    ])
    const projectRoot = join(dir, 'proj')
    const lines = quickStart(projectRoot).split('\n')
    const step = lines.find((line) => line.startsWith('# set in api/.env: '))
    expect(step).toBeDefined()
    const named = step!.slice('# set in api/.env: '.length).split(', ')
    expect(named).toContain('STRIPE_SECRET_KEY')
    // Every variable it names is one the file left empty.
    const blank = blankVariables(join(projectRoot, 'api', '.env'))
    for (const name of named) expect(blank).toContain(name)
    expect(lines.some((line) => /fill in credentials/.test(line))).toBe(false)
  })

  it('names the variables a template leaves empty, from the files it wrote', async () => {
    await runCreate(['proj', '--template', 'blog', '--skip-install'])
    const projectRoot = join(dir, 'proj')
    const steps = quickStart(projectRoot)
      .split('\n')
      .filter((line) => line.startsWith('# set in '))
    expect(steps.length).toBeGreaterThan(0)
    for (const step of steps) {
      const [, file, names] = /^# set in (\S+): (.+)$/.exec(step)!
      const blank = blankVariables(join(projectRoot, file))
      for (const name of names.split(', ')) expect(blank).toContain(name)
    }
  })
})
