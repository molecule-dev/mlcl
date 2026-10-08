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
 * @module
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

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
})
