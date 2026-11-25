/**
 * A `mlcl inject` with no one to confirm its plan reports the files it wrote, not the plan.
 *
 * Agents, CI and the molecule MCP server run inject without a TTY (or with `--force`), so its plan
 * preview asked nobody anything. In the r18 add eval (2026-11-24) the plan, with absolute paths,
 * was 2.6 KB of a 4.3 KB `mlcl add --inject` result, ahead of the usage the agent needed. A run like
 * that now ends with the files it created and changed, relative to where it ran; `--dry-run` still
 * prints the plan, and so does an interactive run that asks to proceed.
 *
 * Runs the REAL oclif command against a temp API project (`execa` mocked).
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Inject from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-reports-'))
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'files-api',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
      devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
    }),
  )
  prevCwd = process.cwd()
  process.chdir(dir)
  execaMock.mockResolvedValue({ stdout: '', stderr: '' } as never)
})

afterEach(async () => {
  process.chdir(prevCwd)
  execaMock.mockReset()
  vi.restoreAllMocks()
  await rm(dir, { recursive: true, force: true })
})

/** Run inject on the project and return what it logged. */
async function inject(
  extra: string[] = [],
  molecules = ['@molecule/api-database-pglite'],
): Promise<string[]> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      ...molecules.flatMap((name) => ['-m', name]),
      '-p',
      dir,
      '--no-test',
      '--no-format',
      '--no-ai',
      ...extra,
    ],
    config,
  )
  const lines: string[] = []
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation(
    (line?: string) => void lines.push(stripVTControlCharacters(line ?? '')),
  )
  await cmd.run()
  return lines
}

describe('mlcl inject with no one to confirm', () => {
  it('names the files it wrote, relative to where it ran, and prints no plan (OLD MUSTFAIL)', async () => {
    const lines = await inject(['--force'])
    expect(lines).not.toContain('Injection Plan:')
    const files = lines.filter((line) => /^ {2}[+~] /.test(line))
    expect(files.length).toBeGreaterThan(0)
    expect(files.some((line) => line.includes('src/bonds/'))).toBe(true)
    for (const line of files) expect(line).not.toContain(dir)
  })

  it('counts the files it lists, each once (OLD MUSTFAIL)', async () => {
    // Each plan that declares dependencies modifies package.json: the summary said "modified 4
    // files" above a list of one, and an agent ran git status to find the other three (harness
    // eval `add`, 2026-11-25).
    let out = ''
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      out += String(chunk)
      return true
    })
    const lines = await inject(
      ['--force'],
      ['@molecule/api-database-pglite', '@molecule/api-database-postgresql'],
    )
    const summary = /Created (\d+) files, modified (\d+) files/.exec(stripVTControlCharacters(out))
    expect(summary).not.toBeNull()
    const listed = (mark: string): number =>
      lines.filter((line) => line.startsWith(`  ${mark} `)).length
    expect(listed('~')).toBeGreaterThan(0)
    expect([Number(summary![1]), Number(summary![2])]).toEqual([listed('+'), listed('~')])
  })

  it('in a project mlcl did not create, ends with the files after the guide, each short one with its code (OLD MUSTFAIL)', async () => {
    // The report named the files above the guide, Claude opened src/bonds/ after three of five
    // adds to see them, and a `| tail -30` of the report kept the type declarations instead
    // (harness eval `add`, 2026-11-25).
    const lines = await inject(['--force', '--guide', '@molecule/api-database-pglite'])
    const guide = lines.findIndex((line) => line.startsWith('Your code calls it through'))
    const bond = lines.indexOf('  + src/bonds/database-pglite.js')
    expect(guide).toBeGreaterThanOrEqual(0)
    expect(bond).toBeGreaterThan(guide)
    const code = (at: number): string[] => {
      const next = lines.findIndex((line, index) => index > at && !line.startsWith('      '))
      return lines.slice(at + 1, next)
    }
    expect(code(bond).some((line) => line.includes("from '@molecule/api-database-pglite'"))).toBe(
      true,
    )
    expect(
      code(lines.indexOf('  + src/bonds/index.js')).some((line) =>
        line.includes('setupDatabasePglite()'),
      ),
    ).toBe(true)
    // The migration runner is long: named only.
    expect(code(lines.indexOf('  + src/scripts/migrate.js'))).toEqual([])
  })

  it('counterexample: in a project mlcl created, names the files only', async () => {
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as object
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ ...manifest, molecule: { projectType: 'api' } }),
    )
    const lines = await inject(['--force'])
    // It writes the project's TypeScript layout, entry point included.
    const bond = lines.indexOf('  + src/bonds/database-pglite.ts')
    expect(bond).toBeGreaterThanOrEqual(0)
    expect(lines[bond + 1]).not.toMatch(/^ {6}/)
  })

  it('counterexample: --dry-run still prints the plan and writes nothing', async () => {
    const lines = await inject(['--dry-run'])
    expect(lines).toContain('Injection Plan:')
    expect(lines.filter((line) => /^ {2}[+~] /.test(line))).toEqual([])
  })
})
