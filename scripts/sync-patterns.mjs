#!/usr/bin/env node
/**
 * Sync polish-v2 pattern docs into the mlcl templates tree.
 *
 * Authoring venue (source of truth for edits):
 *   reference/flagship-apps-scripts/v2/lib/patterns/*.md
 * Shipped location (committed to mlcl, copied into every scaffolded project):
 *   mlcl/templates/.agents/skills/patterns/*.md
 *
 * Run without flags to sync reference → templates.
 * Run with --check to verify no drift and exit non-zero if drift is detected.
 *
 * `reference/` is local-only and has no remote, so teammates without it rely
 * on the committed templates/ copy. This script keeps the two in sync whenever
 * polish-v2 maintainers edit patterns.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MLCL_DIR = resolve(__dirname, '..')
const WORKSPACE_DIR = resolve(MLCL_DIR, '..')

const SRC = join(WORKSPACE_DIR, 'reference/flagship-apps-scripts/v2/lib/patterns')
const DEST = join(MLCL_DIR, 'templates/.agents/skills/patterns')

const args = new Set(process.argv.slice(2))
const checkMode = args.has('--check')

if (!existsSync(SRC)) {
  console.error(`reference patterns not found at ${SRC}`)
  console.error('(reference/ is local-only; skip this step if you do not have it)')
  process.exit(checkMode ? 0 : 1)
}

mkdirSync(DEST, { recursive: true })

const srcFiles = readdirSync(SRC).filter((f) => f.endsWith('.md'))
const destFiles = new Set(readdirSync(DEST).filter((f) => f.endsWith('.md')))

const drift = []
let synced = 0

for (const name of srcFiles) {
  const srcContent = readFileSync(join(SRC, name), 'utf-8')
  const destPath = join(DEST, name)
  const destContent = existsSync(destPath) ? readFileSync(destPath, 'utf-8') : null
  if (srcContent === destContent) {
    destFiles.delete(name)
    continue
  }
  if (checkMode) {
    drift.push(destContent === null ? `missing: ${name}` : `changed: ${name}`)
  } else {
    writeFileSync(destPath, srcContent, 'utf-8')
    synced++
  }
  destFiles.delete(name)
}

for (const orphan of destFiles) {
  if (checkMode) drift.push(`orphan: ${orphan}`)
}

if (checkMode) {
  if (drift.length > 0) {
    console.error(`patterns out of sync (${drift.length}):`)
    for (const line of drift) console.error(`  ${line}`)
    console.error('run `node scripts/sync-patterns.mjs` to sync')
    process.exit(1)
  }
  console.log(`patterns in sync (${srcFiles.length} file(s))`)
} else {
  console.log(`synced ${synced} file(s) from reference/ → templates/`)
}
