/**
 * `bin/stale-build.js`: in a source checkout, a source file saved after `dist/` was built is named
 * on every CLI run, with the rebuild command. On 2026-11-20 a scaffold commit's dist was never
 * rebuilt and local `mlcl create` wrote an unfilled `{{FRAMEWORK_CONFIG}}` for six hours, failing
 * with a Prettier parse error that named neither the build nor the fix.
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BUILD_STAMP, staleBuildWarning } from '../../../bin/stale-build.mjs'

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

describe('stale build warning', () => {
  it('names the newest source file saved after the build started, and the rebuild command', () => {
    file('src/lib/scaffold.ts', '2026-11-20T00:35:16Z')
    file('src/lib/older.ts', '2026-11-19T20:00:00Z')
    const warning = staleBuildWarning(root)
    expect(warning).toContain('src/lib/scaffold.ts changed at 2026-11-20T00:35:16.000Z')
    expect(warning).toContain('after dist/ was built (2026-11-19T18:30:00.000Z)')
    expect(warning).toContain(`Rebuild: cd ${root} && npm run build`)
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
