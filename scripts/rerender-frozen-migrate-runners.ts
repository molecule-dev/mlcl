/**
 * Re-renders every flagship template's frozen `api/src/scripts/migrate.ts` that is in
 * the rendered shape (it carries `const BROWSER_PROFILE`) from migrate.ts.tpl — the
 * exact output scaffolding writes, which `frozen-migrate-runners.test.ts` pins. Run it
 * after changing migrate.ts.tpl; `--dry-run` lists what would change.
 *
 * Usage: npx tsx scripts/rerender-frozen-migrate-runners.ts [--dry-run]
 *
 * @module
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { readMigrateRunnerForManifest } from '../src/lib/migrate-runner.js'

const dryRun = process.argv.includes('--dry-run')
const templates = join(import.meta.dirname, '..', 'templates', 'apps')
let changed = 0
for (const app of (await readdir(templates)).sort()) {
  const apiDir = join(templates, app, 'api')
  const path = join(apiDir, 'src', 'scripts', 'migrate.ts')
  let source: string
  try {
    source = await readFile(path, 'utf-8')
  } catch (_error) {
    // No runner: a database-less template.
    continue
  }
  if (!source.includes('const BROWSER_PROFILE')) continue
  const rendered = await readMigrateRunnerForManifest(apiDir)
  if (rendered === source) continue
  changed++
  console.log(`${dryRun ? 'would update' : 'updated'} ${path}`)
  if (!dryRun) await writeFile(path, rendered)
}
console.log(`${changed} runner(s) ${dryRun ? 'out of date' : 'updated'}`)
