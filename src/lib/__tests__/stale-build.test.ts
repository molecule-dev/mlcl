/**
 * The checkout check dates the compiled CLI by when compilation began so it
 * can notice source edits made during compilation.
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  BUILD_STAMP,
  buildInputs,
  FAILED_BUILD,
  lastFailedBuild,
  staleBuildWarning,
} from '../../../bin/stale-build.mjs'

let root: string
const at = (iso: string): Date => new Date(iso)

/** Writes `path` under the scratch root with the given mtime. */
function file(path: string, mtime: string, text = ''): void {
  const full = join(root, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, text)
  utimesSync(full, at(mtime), at(mtime))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-stale-build-'))
  file('dist/index.js', '2026-11-19T18:30:00Z')
  file(`dist/${BUILD_STAMP}`, '2026-11-19T18:30:05Z', `${at('2026-11-19T18:30:00Z').getTime()}\n`)
  file('src/index.ts', '2026-11-19T10:00:00Z')
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('checkout build freshness', () => {
  it('names the newest source file saved after the build started', () => {
    file('src/lib/scaffold.ts', '2026-11-20T00:35:16Z')
    file('src/lib/older.ts', '2026-11-19T20:00:00Z')
    const reason = staleBuildWarning(root)
    expect(reason).toContain('src/lib/scaffold.ts changed at 2026-11-20T00:35:16.000Z')
    expect(reason).toContain('after dist/ was built (2026-11-19T18:30:00.000Z)')
  })

  it('says nothing when every source file predates the build', () => {
    file('src/lib/scaffold.ts', '2026-11-19T18:29:59Z')
    expect(staleBuildWarning(root)).toBeNull()
  })

  it('ignores tests, which are not compiled into dist/', () => {
    file('src/lib/__tests__/scaffold.test.ts', '2026-11-20T09:00:00Z')
    expect(staleBuildWarning(root)).toBeNull()
  })

  it("dates a build without a stamp by its entry file's mtime", () => {
    rmSync(join(root, 'dist', BUILD_STAMP))
    file('src/lib/scaffold.ts', '2026-11-19T18:30:01Z')
    expect(staleBuildWarning(root)).toContain('after dist/ was built (2026-11-19T18:30:00.000Z)')
  })

  it('does nothing in a published install, which ships no src/', () => {
    rmSync(join(root, 'src'), { recursive: true })
    expect(staleBuildWarning(root)).toBeNull()
  })
})

describe('a failed rebuild', () => {
  const record = (inputs: string): void =>
    file(
      `dist/${FAILED_BUILD}`,
      '2026-11-19T18:40:00Z',
      `${JSON.stringify({ inputs, status: 2 })}\n`,
    )

  it('is remembered for the inputs it compiled', () => {
    record(buildInputs(root))
    expect(lastFailedBuild(root)).toEqual({ inputs: buildInputs(root), status: 2 })
  })

  it('is forgotten once a source file changes, is added or is removed', () => {
    record(buildInputs(root))
    file('src/lib/added.ts', '2026-11-19T09:00:00Z')
    expect(lastFailedBuild(root)).toBeNull()
    record(buildInputs(root))
    rmSync(join(root, 'src/lib/added.ts'))
    expect(lastFailedBuild(root)).toBeNull()
  })

  it('is forgotten once the manifest, tsconfig or an installed tree changes', () => {
    for (const changed of ['package.json', 'tsconfig.json', 'node_modules/.package-lock.json']) {
      record(buildInputs(root))
      file(changed, '2026-11-19T19:00:00Z')
      expect(lastFailedBuild(root)).toBeNull()
    }
  })

  it('is ignored when half-written by a concurrent builder', () => {
    file(`dist/${FAILED_BUILD}`, '2026-11-19T18:40:00Z', '{"inputs": "')
    expect(lastFailedBuild(root)).toBeNull()
  })
})
