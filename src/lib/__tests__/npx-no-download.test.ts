/**
 * Every `npx` that mlcl spawns says whether it may download a package.
 *
 * A bare `npx <tool>` runs the project's own copy when it is installed and silently downloads the
 * newest one from npm when it is not. After a failed install, `mlcl create`'s smoke run got vitest
 * 5.1.2 instead of the project's pin, which crashed on a missing `vite` and printed a second,
 * misleading failure (harness eval build, 2026-11-27). A project tool runs with `--no` (npm refuses
 * the download and says the package is missing); a package mlcl means to fetch, such as
 * `molecule-mcp`, runs with `-y`.
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

/** Each `<spawner>('npx', [<first arg>` call in mlcl's source, with its file and first argument. */
function npxCalls(files: readonly string[]): { file: string; first: string }[] {
  const call =
    /\b(?:execa|execaSync|spawn|spawnSync|execFile|execFileSync)\(\s*['"]npx['"]\s*,\s*\[\s*['"]([^'"]+)['"]/g
  return files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(call)].map((m) => ({
      file: relative(SRC, file),
      first: m[1]!,
    })),
  )
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

  it('flags a bare npx call (counterexample)', () => {
    const dir = join(import.meta.dirname, 'fixtures')
    const file = join(dir, 'npx-bare.fixture.ts.txt')
    expect(npxCalls([file]).map((c) => c.first)).toEqual(['vitest', '--no'])
  })
})
