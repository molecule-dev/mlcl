/**
 * Every `npx` that mlcl spawns says whether it may download a package, and keeps the tool's flags for the tool.
 *
 * A bare `npx <tool>` runs the project's own copy when it is installed and silently downloads the
 * newest one from npm when it is not. After a failed install, `mlcl create`'s smoke run got vitest
 * 5.1.2 instead of the project's pin, which crashed on a missing `vite` and printed a second,
 * misleading failure (harness eval build, 2026-11-27). A project tool runs with `--no` (npm refuses
 * the download and says the package is missing); a package mlcl means to fetch, such as
 * `molecule-mcp`, runs with `-y`.
 *
 * A flag written right after the package name is npm's own to read: npm 11.20 drops an unknown one
 * ("Unknown cli config") and answers a known one itself (`--help`, `--version`), and the tool never
 * sees it. `npx --no vite --port 5200 --strictPort` handed Vite only the number, so every showcase
 * listened on Vite's default port and each visual comparison failed on a refused connection
 * (2026-11-27, the day `--no` was added). So `--` stands after the download flag whenever a flag
 * follows the tool; a positional first (`vitest run --reporter=verbose`) already keeps the flags with
 * the tool.
 *
 * @module
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '..', '..')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === '__tests__' || name === 'node_modules') return []
    if (statSync(path).isDirectory()) return sources(path)
    return /\.ts$/.test(name) ? [path] : []
  })
}

/**
 * Each `<spawner>('npx', [<arguments>]` call in mlcl's source whose arguments are an array literal,
 * with its file, its first argument, and what follows the tool's name.
 */
function npxCalls(files: readonly string[]): {
  file: string
  first: string
  /** Whether `--` is the second argument. */
  separated: boolean
  /** The argument after the tool's name, when the call has one. */
  afterTool: string | undefined
}[] {
  const call =
    /\b(?:execa|execaSync|spawn|spawnSync|execFile|execFileSync)\(\s*['"]npx['"]\s*,\s*\[([^\]]*)\]/g
  return files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(call)].map((m) => {
      const literal = (argument: string): string => argument.trim().replace(/^['"]|['"]$/g, '')
      const arguments_ = m[1]!.split(',').map(literal)
      return {
        file: relative(SRC, file),
        first: arguments_[0] ?? '',
        separated: arguments_[1] === '--',
        afterTool: arguments_[arguments_[1] === '--' ? 3 : 2],
      }
    }),
  )
}

/** The calls whose tool is handed a flag that npm reads first: no `--`, and a flag right after the tool. */
function flagsNpmReadsFirst(files: readonly string[]): string[] {
  return npxCalls(files)
    .filter((call) => !call.separated && call.afterTool?.startsWith('-'))
    .map((call) => `${call.file}: npx ${call.first} … ${call.afterTool}`)
}

describe('npx calls in mlcl', () => {
  it('finds the calls it checks', () => {
    // A scan that matched nothing would pass any tree.
    expect(npxCalls(sources(SRC)).length).toBeGreaterThanOrEqual(4)
  })

  it('pass --no for a project tool, or -y for a package mlcl means to fetch', () => {
    const undecided = npxCalls(sources(SRC)).filter(
      (c) => !['--no', '-y', '--yes'].includes(c.first),
    )
    expect(undecided).toEqual([])
  })

  it("put -- after the download flag when a flag follows the tool, so npm doesn't read it", () => {
    expect(flagsNpmReadsFirst(sources(SRC))).toEqual([])
  })

  it('flags a bare npx call (counterexample)', () => {
    const dir = join(import.meta.dirname, 'fixtures')
    const file = join(dir, 'npx-bare.fixture.ts.txt')
    expect(npxCalls([file]).map((c) => c.first)).toEqual(['vitest', '--no', '--no', '--no'])
  })

  it('flags a flag written right after the tool, and not one behind -- (counterexample)', () => {
    const file = join(import.meta.dirname, 'fixtures', 'npx-bare.fixture.ts.txt')
    expect(flagsNpmReadsFirst([file])).toEqual([
      'lib/__tests__/fixtures/npx-bare.fixture.ts.txt: npx --no … --port',
    ])
  })
})
