/**
 * One-time, idempotent migration: correct phantom `-react`-suffixed locale
 * registry keys.
 *
 * Background: a bulk feature-extraction pass registered each framework-specific
 * feature's companion locale under a key/path DERIVED FROM THE FEATURE NAME
 * (e.g. `@molecule/app-locales-oauth-buttons-react`, path
 * `packages/app/locales/oauth-buttons-react`). But locale bonds are pure data
 * shared across framework variants, so the REAL package drops the `-react`:
 * `@molecule/app-locales-oauth-buttons` at `packages/app/locales/oauth-buttons`.
 * The phantom key has no package on disk, so when `resolveLocalePackages` pulls
 * it into a scaffold's package.json, `npm install` 404s (the dep doesn't exist).
 *
 * This script renames every `@molecule/{api,app}-locales-<name>-react` key to
 * `@molecule/{api,app}-locales-<name>` and fixes its `path`, but ONLY when the
 * real (no-`-react`) package exists on disk with the matching package.json name
 * and there is no key collision. Order is preserved and the file is re-emitted
 * with the same `JSON.stringify(_, null, 2) + '\n'` formatting the CLI uses, so
 * the diff is exactly the renamed entries.
 *
 * Idempotent: re-running after a successful pass renames nothing (no phantoms
 * left). The durable guard against regressions is the enforcement test in
 * src/lib/__tests__/locale-registry.test.ts.
 *
 * Usage: node scripts/fix-phantom-locale-registry-keys.mjs [--dry-run]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const mlclRoot = join(here, '..')
const moleculeRoot = join(mlclRoot, '..', 'molecule')
const registryPath = join(mlclRoot, 'registry.json')
const dryRun = process.argv.includes('--dry-run')

const PHANTOM_RE = /^@molecule\/(?:api|app)-locales-.+-react$/

const reg = JSON.parse(readFileSync(registryPath, 'utf8'))

const renamed = []
const skipped = []
const rebuilt = {}

for (const [key, val] of Object.entries(reg.packages)) {
  if (!PHANTOM_RE.test(key)) {
    rebuilt[key] = val
    continue
  }
  const correctKey = key.replace(/-react$/, '')
  const correctPath = typeof val.path === 'string' ? val.path.replace(/-react$/, '') : val.path

  // Verify the real package exists on disk with the matching name.
  let diskName = null
  const pkgJson = correctPath && join(moleculeRoot, correctPath, 'package.json')
  if (pkgJson && existsSync(pkgJson)) {
    try {
      diskName = JSON.parse(readFileSync(pkgJson, 'utf8')).name
    } catch (_error) {
      // Unreadable/malformed package.json leaves diskName undefined, which the
      // comparison below reports as a mismatch — the outcome we want anyway.
    }
  }
  if (diskName !== correctKey) {
    skipped.push(`${key}: disk name ${diskName ?? '(none)'} != ${correctKey} at ${correctPath}`)
    rebuilt[key] = val
    continue
  }
  if (reg.packages[correctKey] || rebuilt[correctKey]) {
    skipped.push(`${key}: collision — ${correctKey} already exists`)
    rebuilt[key] = val
    continue
  }

  rebuilt[correctKey] = { ...val, path: correctPath }
  renamed.push(`${key} → ${correctKey}  (path: ${correctPath})`)
}

reg.packages = rebuilt

console.log(`renamed: ${renamed.length}, skipped: ${skipped.length}`)
for (const r of renamed) console.log('  ✓ ' + r)
for (const s of skipped) console.log('  ⚠ SKIP ' + s)

if (dryRun) {
  console.log('\n(dry-run — registry.json not written)')
} else if (renamed.length > 0) {
  writeFileSync(registryPath, JSON.stringify(reg, null, 2) + '\n', 'utf8')
  console.log('\nregistry.json updated.')
} else {
  console.log('\nNothing to do — no phantom -react locale keys found.')
}
