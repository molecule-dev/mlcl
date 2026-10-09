/**
 * The flagship templates carry frozen copies of `api/src/scripts/migrate.ts`.
 * Scaffolding overwrites each copy from migrate.ts.tpl at create time
 * (`copyTemplateInstance` → `readMigrateRunnerForManifest`), but that refresh
 * sits in a silent try/catch — the CHECKED-IN copy is what ships if it ever
 * fails. On 2026-10-08 one copy (field-service) still echoed the raw
 * DATABASE_URL, password included, to stderr on a failed connect. The whole
 * fleet must be leak-free as it sits in the repo, not only after a successful
 * refresh.
 *
 * The copies that are already in the RENDERED shape (they carry the scaffold
 * flag the renderer substitutes) are pinned byte-for-byte to the current
 * render of their own manifest — the exact output the silent scaffold refresh
 * writes. A template fix that reaches the .tpl but not the frozen copy (the
 * benign-error widening, the admin-socket finally and the __setup__ gate all
 * landed after field-service's 2026-10-08 refresh, so the checked-in copy
 * shipped the boot-looping predicate, the leaky admin socket and the
 * swallow-all replay until this test existed) fails here instead of waiting
 * for a scaffold whose refresh may never run.
 *
 * @module
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { readMigrateRunnerForManifest } from '../migrate-runner.js'

const TEMPLATES_DIR = join(import.meta.dirname, '..', '..', '..', 'templates', 'apps')

describe('frozen migration runners', () => {
  it('no template runner logs the raw DATABASE_URL', async () => {
    const apps = (await readdir(TEMPLATES_DIR)).sort()
    const runners: Array<[string, string]> = []
    for (const app of apps) {
      const path = join(TEMPLATES_DIR, app, 'api', 'src', 'scripts', 'migrate.ts')
      try {
        runners.push([app, await readFile(path, 'utf-8')])
      } catch (_error) {
        // readFile throws when the template ships no runner — database-less
        // templates are out of scope.
      }
    }
    // The scan must actually cover the fleet, or the assertion is vacuous.
    expect(runners.length).toBeGreaterThanOrEqual(150)
    // Same shape as the rendered-runner test in migrate-runner.test.ts: the
    // raw URL may only ever flow into pg's connectionString, never a
    // console.* call (the redacted hint interpolates
    // ${redactDatabaseUrl(DATABASE_URL)}, which this filter does not match).
    const leaking = runners.filter(([, source]) =>
      source
        .split('\n')
        .some((line) => line.includes('console.') && line.includes('${DATABASE_URL')),
    )
    expect(leaking.map(([app]) => app)).toEqual([])
  })

  it('a frozen copy in the rendered shape matches the current render of its own manifest', async () => {
    const apps = (await readdir(TEMPLATES_DIR)).sort()
    const checked: string[] = []
    for (const app of apps) {
      const apiDir = join(TEMPLATES_DIR, app, 'api')
      const path = join(apiDir, 'src', 'scripts', 'migrate.ts')
      let source: string
      try {
        source = await readFile(path, 'utf-8')
      } catch (_error) {
        // readFile throws when the template ships no runner — database-less
        // templates are out of scope.
        continue
      }
      // Only the rendered shape carries the scaffold flag; the older delegate
      // shape imports its bond's createMigrator and renders nothing.
      if (!source.includes('const BROWSER_PROFILE')) continue
      checked.push(app)
      // The silent scaffold refresh writes EXACTLY this render — the
      // checked-in copy must already be it, or the copy that ships when the
      // refresh fails is a stale runner (see the module doc).
      expect(source).toBe(await readMigrateRunnerForManifest(apiDir))
    }
    // Non-vacuousness: the fleet carries at least one rendered-shape copy.
    expect(checked.length).toBeGreaterThanOrEqual(1)
  })
})
