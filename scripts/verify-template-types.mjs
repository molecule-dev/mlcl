#!/usr/bin/env node
/**
 * Fleet template type-check gate.
 *
 * Type-checks every flagship template's app/ and api/ workspace directly from
 * source (`tsc --noEmit`). Flagship templates are the substrate the AI executor
 * adapts; a template type error fails verify on EVERY build of that template (the
 * executor writes 0 files yet `verify=error`), so templates MUST be clean out of
 * the box. The fleet's other checks verify imports resolve + catalogs are in sync
 * but do NOT run tsc — this gate closes that gap.
 *
 * Exit 0 if every workspace is clean; exit 1 (with the failing list) otherwise.
 *
 * Usage:
 *   node scripts/verify-template-types.mjs            # all templates, app + api
 *   node scripts/verify-template-types.mjs --app-only # skip api/ (faster)
 *   node scripts/verify-template-types.mjs <slug> ... # only the named templates
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APPS_DIR = join(MLCL_ROOT, 'templates', 'apps')

// Prefer the workspace's native TS7 tsc for this pure --noEmit sweep (~10x
// faster; see workspace scripts/lib/native-tsc.mjs). Standalone mlcl clones
// (no workspace parent) fall back to plain `npx tsc` — same verdicts, slower.
const TSC_CMD = await (async () => {
  try {
    const { nativeTscPath } = await import(
      pathToFileURL(join(MLCL_ROOT, '..', 'scripts', 'lib', 'native-tsc.mjs')).href
    )
    const bin = nativeTscPath()
    if (bin) return `${JSON.stringify(bin)} --noEmit`
  } catch (_error) {
    // workspace helper absent (standalone clone) — use the classic compiler
  }
  return 'npx tsc --noEmit'
})()

const args = process.argv.slice(2)
const appOnly = args.includes('--app-only')
const slugs = args.filter((a) => !a.startsWith('--'))

const apps = (
  slugs.length
    ? slugs
    : readdirSync(APPS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
).filter((slug) => existsSync(join(APPS_DIR, slug)))

const workspaces = appOnly ? ['app'] : ['app', 'api']
const failures = []
let checked = 0

for (const slug of apps) {
  for (const ws of workspaces) {
    const dir = join(APPS_DIR, slug, ws)
    if (!existsSync(join(dir, 'tsconfig.json'))) continue
    checked++
    try {
      execSync(TSC_CMD, { cwd: dir, stdio: 'pipe', timeout: 180000 })
    } catch (e) {
      const out = `${e.stdout || ''}${e.stderr || ''}`
      const errs = out.split('\n').filter((l) => /error TS\d+/.test(l))
      failures.push({ slug, ws, errs })
    }
    process.stdout.write(`\r[${checked}] checked — ${failures.length} failing   `)
  }
}

process.stdout.write('\n')
if (failures.length === 0) {
  console.log(`✓ template types clean — ${checked} workspaces, 0 type errors`)
  process.exit(0)
}

console.error(`\n✗ ${failures.length} template workspace(s) with type errors:\n`)
for (const f of failures) {
  console.error(`  ${f.slug}/${f.ws}`)
  for (const e of f.errs.slice(0, 5)) console.error(`    ${e.trim()}`)
}
console.error(
  `\nFix these — flagship templates must type-check out of the box (a template ` +
    `type error fails verify on every build of that template).`,
)
process.exit(1)
