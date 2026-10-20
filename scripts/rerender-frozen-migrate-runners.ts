/**
 * Re-renders every flagship template's frozen `api/src/scripts/migrate.ts` that is in
 * the rendered shape (it carries `const BROWSER_PROFILE`) from migrate.ts.tpl — the
 * exact output scaffolding writes, which `frozen-migrate-runners.test.ts` pins. Run it
 * after changing migrate.ts.tpl; `--dry-run` lists what would change.
 * `--legacy-paths` also updates asset lookup in older delegates, preserving
 * their database imports and migration behavior.
 *
 * Usage: npx tsx scripts/rerender-frozen-migrate-runners.ts [--dry-run]
 *
 * @module
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { readMigrateRunnerForManifest } from '../src/lib/migrate-runner.js'

const dryRun = process.argv.includes('--dry-run')
const legacyPaths = process.argv.includes('--legacy-paths')
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
  const isRendered = source.includes('const BROWSER_PROFILE')
  if (!isRendered && !legacyPaths) continue
  const rendered = await readMigrateRunnerForManifest(apiDir)
  let next = rendered
  if (!isRendered) {
    const root = rendered.match(/\/\/ Resolve assets from the API package,[\s\S]*?\n}/)?.[0]
    if (!root) throw new Error(`Missing canonical API root resolution for ${app}`)
    const oldPath =
      "const migrationsDir = join(new URL('.', import.meta.url).pathname, '../../migrations')"
    if (
      source.includes(root) &&
      source.includes("const migrationsDir = join(apiDir, 'migrations')")
    ) {
      continue
    }
    if (!source.includes(oldPath) || !source.includes("import { join } from 'path'")) {
      throw new Error(`Unrecognized legacy migration runner: ${path}`)
    }
    next = source
      .replace(
        "import { join } from 'path'",
        "import { existsSync } from 'fs'\nimport { dirname, join } from 'path'",
      )
      .replace(oldPath, `${root}\n\nconst migrationsDir = join(apiDir, 'migrations')`)
  }
  if (next === source) continue
  changed++
  console.log(`${dryRun ? 'would update' : 'updated'} ${path}`)
  if (!dryRun) await writeFile(path, next)
}
console.log(`${changed} runner(s) ${dryRun ? 'out of date' : 'updated'}`)
