#!/usr/bin/env node
/**
 * Keep the fleet-size claims in mlcl's own docs true — the package count in
 * README.md and docs/LISTINGS.md (and the template count beside it), derived
 * from registry.json / templates/apps so a "900+" never rots past the 1,000th
 * package again.
 *
 * Runs automatically in `prepack` (the README ships with the tarball) and on
 * demand via `npm run sync:fleet-counts`. package.json's own `description` is
 * deliberately NOT touched: npm parses the manifest before scripts run, so a
 * prepack mutation could not reach the published metadata — that string is
 * kept number-free instead.
 *
 * Idempotent; exits 0 with a report either way. `--check` fails when a claim
 * is stale (for CI/pre-commit use).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')

const registry = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8'))
const packages = Object.keys(registry.packages ?? {}).length
if (!packages) {
  console.error('inject-fleet-counts: registry.json has no packages — refusing to write 0')
  process.exit(1)
}
const templatesDir = join(root, 'templates', 'apps')
// Same definition as the site catalog (generate-template-catalog.mjs): every
// directory holding a template.json, minus those marked "unlisted": true.
const templates = existsSync(templatesDir)
  ? readdirSync(templatesDir).filter((slug) => {
      const manifest = join(templatesDir, slug, 'template.json')
      if (!existsSync(manifest)) return false
      try {
        return JSON.parse(readFileSync(manifest, 'utf8')).unlisted !== true
      } catch (_error) {
        // Malformed manifest — not countable (the site catalog throws instead;
        // a count script has no business failing the release over it).
        return false
      }
    }).length
  : null

/** Replace every count claim with the true count; staleness = the text changed. */
function syncClaims(text, path) {
  let claims = 0
  let out = text.replace(/\blist \d+ flagship app templates/g, () => {
    claims++
    return `list ${templates} flagship app templates`
  })
  // Order-tolerant: catches "150 flagship", "150+ flagship", and any earlier
  // run's mangling of either.
  out = out.replace(/\b\d+\s*\+?\s*flagship/g, () => {
    claims++
    return `${templates}+ flagship`
  })
  out = out.replace(/\b\d{3,4}\+ composable/g, () => {
    claims++
    return `${packages}+ composable`
  })
  if (out === text) {
    if (check) console.log(`inject-fleet-counts: ${path} current`)
    return false
  }
  if (check) {
    console.error(
      `inject-fleet-counts: ${path} holds stale count claim(s) — run npm run sync:fleet-counts`,
    )
    process.exitCode = 1
    return true
  }
  writeFileSync(path, out)
  console.log(`inject-fleet-counts: ${path} — ${claims} claim site(s) refreshed`)
  return true
}

let changed = false
changed = syncClaims(readFileSync(join(root, 'README.md'), 'utf8'), 'README.md') || changed
const listings = join(root, 'docs', 'LISTINGS.md')
if (existsSync(listings)) {
  changed = syncClaims(readFileSync(listings, 'utf8'), 'docs/LISTINGS.md') || changed
}
if (!check && !changed) console.log('inject-fleet-counts: all claims already current')
