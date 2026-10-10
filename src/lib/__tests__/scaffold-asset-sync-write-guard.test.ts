/**
 * `syncProjectAssets` rewrites the app's `index.html` (the `<style>` block of
 * `@font-face` rules) IN PLACE — and it runs on a project that already exists:
 * `mlcl inject` calls it after the injection lands, and a failure there is
 * caught and reported as the warning "Asset sync skipped".
 *
 * `writeFile` truncates before it writes, so a failed write (a full disk, EIO)
 * left a PARTIAL index.html — the app's entry document, which Vite builds from
 * and the preview renders. The command then continued and could exit 0,
 * reporting success over a project whose `index.html` no longer parses.
 *
 * The write now goes through `writeGuarded` (same policy as the migration
 * runner's): a failed write restores the bytes that were there, so the failure
 * is the only thing it leaves behind. This test simulates the partial write —
 * the file is truncated to garbage and THEN the error surfaces, the shape no
 * pre-write check can produce — and asserts the original document survives.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type * as fsPromises from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** When set, the NEXT write to this exact path truncates and then throws. */
const shortWrite = vi.hoisted(() => ({ path: null as string | null }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>()
  type WriteFileArgs = Parameters<typeof actual.writeFile>
  return {
    ...actual,
    writeFile: async (
      path: WriteFileArgs[0],
      data: WriteFileArgs[1],
      options?: WriteFileArgs[2],
    ): Promise<void> => {
      if (shortWrite.path !== null && String(path) === shortWrite.path) {
        // A short write on ENOSPC: the truncating open has already destroyed
        // the file's contents by the time the error is raised. It fires ONCE —
        // a transient full disk does not repeat, and the guard's own restore
        // write has to go through.
        shortWrite.path = null
        await actual.writeFile(path, 'TRUNCATED-BEFORE-FAILURE', options)
        throw Object.assign(new Error(`ENOSPC: no space left on device, write '${String(path)}'`), {
          code: 'ENOSPC',
        })
      }
      return actual.writeFile(path, data, options)
    },
  }
})

import { syncProjectAssets } from '../scaffold.js'

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- mol:fonts -->
    <style>@font-face { font-family: 'Inter'; }</style>
    <!-- /mol:fonts -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

let projectDir: string

beforeEach(() => {
  shortWrite.path = null
  projectDir = mkdtempSync(join(tmpdir(), 'mlcl-asset-sync-guard-'))
  // A project declaring a font bond the registry knows, so the sync reaches the
  // index.html font-block write (see syncProjectAssets).
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify({ name: 'font-app', dependencies: { '@molecule/app-fonts-inter': '1.0.0' } }),
  )
  writeFileSync(join(projectDir, 'index.html'), INDEX_HTML)
  mkdirSync(join(projectDir, 'public', 'fonts'), { recursive: true })
})

afterEach(() => {
  shortWrite.path = null
  rmSync(projectDir, { recursive: true, force: true })
})

describe('syncProjectAssets — a failed index.html write', () => {
  it('restores the entry document instead of leaving a truncated one', async () => {
    shortWrite.path = join(projectDir, 'index.html')

    // The failure must surface (inject.ts reports it and skips the asset sync) …
    await expect(syncProjectAssets(projectDir)).rejects.toThrow(/ENOSPC/)

    // … and the file a user's app is built from must be exactly what it was.
    expect(readFileSync(join(projectDir, 'index.html'), 'utf-8')).toBe(INDEX_HTML)
  })

  it('writes the font block when the write succeeds', async () => {
    // The positive twin: without it the assertion above would hold for a sync
    // that simply never writes index.html at all. It must therefore assert what
    // only a WRITE produces — the fixture already carries a one-line
    // `@font-face { font-family: 'Inter'; }` and the closing marker, so
    // asserting those proved nothing. The generated declaration (with its
    // `src:` and the copied file's URL) is the write.
    await syncProjectAssets(projectDir)

    const html = readFileSync(join(projectDir, 'index.html'), 'utf-8')
    expect(html).not.toBe(INDEX_HTML)
    expect(html).toContain("url('/fonts/Inter-Regular.ttf')")
    expect(html).toContain('<!-- /mol:fonts -->')
  })
})
