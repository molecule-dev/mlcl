// @vitest-environment node
/**
 * The scaffold has a family of IN-PLACE rewrites — a file that ALREADY exists is
 * read, modified, written back. The four preview bridges
 * (`injectPreviewNavBridge`, `-Snapshot`, `-Runtime`, `-Interact`) insert their
 * `<script>` into the app's `index.html`; `stampDemoContentNotices` prepends the
 * demo-seed header to each seed module; `syncIdentityFromBranding` rewrites the
 * `<title>`/meta block and each `package.json`.
 *
 * Every one of those writes went through a bare `writeFile` — and `writeFile`
 * truncates before it writes, so a failure mid-write (a full disk, EIO) left a
 * PARTIAL file where a complete one used to be. For the bridges that file is the
 * entry document Vite builds from, so the scaffold reported success over an app
 * that no longer parses. `writeGuarded` (the policy `syncProjectAssets` already
 * uses for the same document) restores the previous bytes instead: a failed write
 * leaves the file as it was, never worse.
 *
 * The failure is simulated the honest way — the file is truncated to garbage and
 * THEN the error surfaces, the shape no pre-write check can produce — and it
 * fires once, because the guard's own restore write must go through.
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
        // A short write on ENOSPC: the truncating open has already destroyed the
        // file's contents by the time the error is raised.
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

import {
  ensureE2EManifest,
  ensureMoleculePeerClosure,
  injectPreviewInteractBridge,
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
  stampDemoContentNotices,
  stampMoleculeMetadata,
} from '../scaffold.js'

/** An entry document with a `</body>` for a bridge to anchor against. */
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>demo</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

/** Every bridge injector, with the sentinel its insertion leaves behind. */
const BRIDGES: Array<[string, (htmlPath: string) => Promise<boolean>, string]> = [
  ['injectPreviewNavBridge', injectPreviewNavBridge, 'mol:nav-bridge'],
  ['injectPreviewSnapshotBridge', injectPreviewSnapshotBridge, 'mol:snapshot-bridge'],
  ['injectPreviewRuntimeBridge', injectPreviewRuntimeBridge, 'mol:runtime-bridge'],
  ['injectPreviewInteractBridge', injectPreviewInteractBridge, 'mol:interact-bridge'],
]

const SEED_SOURCE = `export async function seed(): Promise<void> {
  // the app's own seed
}
`

let dir: string

beforeEach(() => {
  shortWrite.path = null
  dir = mkdtempSync(join(tmpdir(), 'mlcl-scaffold-inplace-guard-'))
})

afterEach(() => {
  shortWrite.path = null
  rmSync(dir, { recursive: true, force: true })
})

describe('scaffold in-place rewrites — a failed write restores the file', () => {
  it.each(BRIDGES)(
    '%s: a failed write leaves the entry document intact (and the bridge lands when it succeeds)',
    async (name, inject, sentinel) => {
      const htmlPath = join(dir, `${name}.html`)
      writeFileSync(htmlPath, INDEX_HTML)
      shortWrite.path = htmlPath

      await expect(inject(htmlPath), `${name} must surface the write failure`).rejects.toThrow(
        /ENOSPC/,
      )
      expect(readFileSync(htmlPath, 'utf-8'), `${name} truncated index.html`).toBe(INDEX_HTML)

      // The positive twin: without it the assertion above would hold for an
      // injector that never wrote anything at all.
      await expect(inject(htmlPath)).resolves.toBe(true)
      const written = readFileSync(htmlPath, 'utf-8')
      expect(written).toContain(sentinel)
      expect(written).toContain('</body>')
    },
  )

  it('stampDemoContentNotices: a failed seed-header write leaves the seed module intact', async () => {
    const apiDir = join(dir, 'api')
    mkdirSync(join(apiDir, 'src'), { recursive: true })
    const seedPath = join(apiDir, 'src', 'seed.ts')
    writeFileSync(seedPath, SEED_SOURCE)

    shortWrite.path = seedPath
    await expect(stampDemoContentNotices(null, apiDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(seedPath, 'utf-8')).toBe(SEED_SOURCE)

    // The positive twin: the header is what this step exists to add.
    await stampDemoContentNotices(null, apiDir)
    const stamped = readFileSync(seedPath, 'utf-8')
    expect(stamped).toContain('DEMO SEED DATA')
    expect(stamped.endsWith(SEED_SOURCE)).toBe(true)
  })

  // The manifest rewrites are the other half of the same policy: `writeGuarded`
  // names "a workspace package.json" among the files it protects, because a
  // truncated manifest is unparseable for every later scaffold step.
  it('ensureE2EManifest: a failed manifest write leaves the manifest parseable', async () => {
    const appDir = join(dir, 'app')
    mkdirSync(appDir, { recursive: true })
    const manifestPath = join(appDir, 'package.json')
    const before = `${JSON.stringify({ name: 'my-app', scripts: { dev: 'vite' } }, null, 2)}\n`
    writeFileSync(manifestPath, before)

    shortWrite.path = manifestPath
    await expect(ensureE2EManifest(appDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(before)

    // The positive twin: the script this step exists to add does land.
    await ensureE2EManifest(appDir)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      scripts: Record<string, string>
    }
    expect(manifest.scripts['test:e2e']).toBe('playwright test')
  })

  it('ensureMoleculePeerClosure: a failed manifest write leaves the manifest parseable', async () => {
    const projectDir = join(dir, 'project')
    mkdirSync(join(projectDir, 'api'), { recursive: true })
    const manifestPath = join(projectDir, 'api', 'package.json')
    const before = `${JSON.stringify({ dependencies: { '@molecule/api-database': '1.0.1' } }, null, 2)}\n`
    writeFileSync(manifestPath, before)

    shortWrite.path = manifestPath
    await expect(ensureMoleculePeerClosure(projectDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(before)

    // The positive twin: the closure this step exists to add does land.
    await ensureMoleculePeerClosure(projectDir)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@molecule/api-database-postgresql']).toBeTruthy()
  })

  // The ROOT manifest is the other half of the same policy — and the last
  // rewrite that was still going through a bare `writeFileSync`, which truncates
  // before it writes just like `writeFile` (and which this suite's mock, being
  // the promises one, would not even have caught).
  it('stampMoleculeMetadata: a failed root-manifest write leaves it parseable, and stamps the real CLI version', async () => {
    const projectDir = join(dir, 'stamped')
    mkdirSync(projectDir, { recursive: true })
    const manifestPath = join(projectDir, 'package.json')
    const before = `${JSON.stringify({ name: 'my-app' }, null, 2)}\n`
    writeFileSync(manifestPath, before)

    shortWrite.path = manifestPath
    await expect(stampMoleculeMetadata(projectDir)).rejects.toThrow(/ENOSPC/)
    expect(readFileSync(manifestPath, 'utf-8')).toBe(before)

    // The positive twin: the provenance this step exists to stamp does land —
    // carrying the CLI's OWN version, never a stale literal (`2.0.0` while the
    // CLI shipped a later one described a generator that never ran).
    await stampMoleculeMetadata(projectDir)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      keywords: string[]
      molecule: { generator: string; version: string; docs: string }
    }
    expect(manifest.keywords).toContain('molecule')
    const cliManifest = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', '..', 'package.json'), 'utf-8'),
    ) as { version: string }
    expect(manifest.molecule.generator).toBe('mlcl')
    expect(manifest.molecule.version).toBe(cliManifest.version)
  })
})
