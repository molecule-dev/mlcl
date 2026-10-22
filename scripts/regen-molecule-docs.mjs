#!/usr/bin/env node
/**
 * Scoped package README.md regenerator.
 *
 * README.md is 100% generated (never hand-edited), but regenerating the whole
 * ~900-package fleet takes ~5 minutes — too slow to run "just in case" before
 * every fresh molecule.dev start. This script regenerates ONLY the packages you
 * name (or, with --changed, the ones with uncommitted changes in the molecule
 * repo) at roughly a third of a second per package, so molecule's pre-commit
 * hook can keep committed docs in lockstep with committed source, and the
 * pre-fresh-start sweep touches only what actually moved.
 *
 * Usage:
 *   node scripts/regen-molecule-docs.mjs packages/api/core/logger [...]
 *       → regenerate the given packages (registry-relative entry.path),
 *         e.g. from molecule's pre-commit hook with the staged package dirs.
 *   node scripts/regen-molecule-docs.mjs --changed
 *       → regenerate every package with uncommitted (staged, unstaged, or
 *         untracked) changes under its src/ or to its package.json. A dirty
 *         manifest selects its package only when the edit can change a
 *         generation input (see doc-inputs.ts) — a test-tool pin
 *         cannot, so a fleet-wide vitest bump does not regenerate the fleet.
 *   ... --check
 *       → write nothing; exit 1 if anything would change (verification).
 *
 * The scoped set is EXPANDED for cross-package doc dependencies:
 *   - core changed        → + its provider bonds (they inherit the core's @e2e)
 *   - provider changed    → + its core (whose doc lists available providers)
 *   - locale bond changed → + the feature(s) naming it as companion locale
 *   - package changed     → + the packages whose source RE-EXPORTS it (their
 *     README embeds its API — e.g. app-react-native `export * from
 *     '@molecule/app-react'`), transitively
 *
 * Prints each written README.md path (molecule-repo-relative) on STDOUT, one
 * per line — the pre-commit hook consumes that to `git add` the regenerated
 * docs into the same commit. Human chatter goes to stderr.
 *
 * Runs via tsx against mlcl SOURCE (not dist), same as check-registry-exports:
 * the docs subgraph imports zero @molecule/* packages, so no build is needed.
 *
 * NOT covered: direct registry.json metadata edits (label / description /
 * implements / secrets / type / category). Those change docs without touching
 * the molecule worktree, so no molecule-side scope can see them — after such an
 * edit, run `mlcl sync-docs --generate` (optionally with -p) yourself.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { manifestChangeAffectsDocs } from '../src/lib/doc-inputs.js'
import { stripGeneratedTimestamp } from '../src/lib/docs-generator.js'
import { companionLocaleFor, discoverReexporters, generateDocs } from '../src/lib/docs-sync.js'
import { getRawRegistry } from '../src/lib/registry.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const mlclRoot = join(__dir, '..')

// Same resolution as sync-docs: MOLECULE_PACKAGES_DIR's parent, else the
// `molecule` sibling repo next to mlcl.
const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
  ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
  : join(mlclRoot, '..', 'molecule')

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const useChanged = args.includes('--changed')
const pathArgs = args.filter((a) => !a.startsWith('--')).map((p) => p.replace(/\/+$/, ''))

if (!useChanged && pathArgs.length === 0) {
  console.error('Usage: regen-molecule-docs.mjs [--check] (--changed | <package-path> ...)')
  process.exit(2)
}

const registry = getRawRegistry()

// entry.path -> package name
const nameByPath = new Map()
for (const [name, entry] of Object.entries(registry.packages)) {
  nameByPath.set(entry.path.replace(/\/+$/, ''), name)
}

/** Reduce a repo-relative file path to its package dir, or null if it isn't a doc input. */
const packageDirOf = (file) => {
  if (!file.startsWith('packages/')) return null
  const stripped = file.replace(/\/src\/.*$/, '').replace(/\/package\.json$/, '')
  return stripped === file ? null : stripped
}

let scopePaths
if (useChanged) {
  // -uall lists individual files inside untracked directories (a brand-new
  // package would otherwise surface as one bare `dir/` entry and match nothing).
  const porcelain = execFileSync('git', ['-C', moleculeDir, 'status', '--porcelain', '-uall'], {
    encoding: 'utf8',
  })
  scopePaths = new Set()
  for (const line of porcelain.split('\n')) {
    if (!line) continue
    // Format: `XY <path>` or `XY <old> -> <new>` (rename); take the new path.
    const rest = line.slice(3)
    const file = rest.includes(' -> ') ? rest.split(' -> ').pop() : rest
    const dir = packageDirOf(file)
    if (!dir) continue
    // A dirty manifest selects its package only when the edit can change a
    // generation input. A test-tool pin cannot, and this is the dirty-tree
    // consumer — `sync-docs:changed` — so a fleet-wide vitest bump must not
    // regenerate the fleet. The comparison is worktree-against-HEAD BY DESIGN
    // here: uncommitted work is exactly what --changed exists to see. Any
    // unreadable side (added/deleted package) stays in scope.
    if (file.endsWith('/package.json')) {
      let before
      try {
        before = execFileSync('git', ['-C', moleculeDir, 'show', `HEAD:${file}`], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
      } catch (_error) {
        before = null
      }
      const afterPath = join(moleculeDir, file)
      const after = existsSync(afterPath) ? readFileSync(afterPath, 'utf8') : null
      if (!manifestChangeAffectsDocs(before, after)) continue
    }
    scopePaths.add(dir)
  }
} else {
  scopePaths = new Set(pathArgs)
}

// Map paths -> names; a path that exists on disk but isn't registered gets a
// warning (register with `mlcl init --force`, then sync); a path that's gone
// (package deleted in this commit) is silently skipped — its README.md is
// deleted along with it.
const names = new Set()
for (const p of scopePaths) {
  const name = nameByPath.get(p)
  if (name) {
    names.add(name)
  } else if (existsSync(join(moleculeDir, p))) {
    console.error(`⚠ ${p} is not in the registry — no README.md generated (run mlcl init --force)`)
  }
}

// Expand for cross-package doc dependencies (see header).
const providersByCore = new Map()
for (const [name, entry] of Object.entries(registry.packages)) {
  if (!entry.implements) continue
  const list = providersByCore.get(entry.implements) ?? []
  list.push(name)
  providersByCore.set(entry.implements, list)
}
const featuresByLocale = new Map()
for (const [name, entry] of Object.entries(registry.packages)) {
  const locale = companionLocaleFor(name, entry, registry)
  if (!locale) continue
  const list = featuresByLocale.get(locale) ?? []
  list.push(name)
  featuresByLocale.set(locale, list)
}
// A package whose source re-exports another @molecule package EMBEDS that
// package's API in its own README (app-react-native `export * from
// '@molecule/app-react'`; api-resource's utilities barrel re-exports
// api-utilities-validation) — so a change to the re-exported package changes
// the re-exporter's doc without touching its worktree. That is how
// react-native/README.md drifted past the hook on 2026-08-29. The relation is
// discovered from source, in the tree being documented — see
// `discoverReexporters` for why that is a filesystem walk rather than a
// `git grep` (the release's gates generate from an export with no `.git`).
const reexportersByTarget = discoverReexporters(registry, moleculeDir)

// Re-export closure FIRST (transitive: A re-exports B re-exports C — a C
// change reaches A), so the added re-exporters get the single-pass expansion
// below too. Deliberately NOT a joint fixpoint with the core/provider rules:
// provider → core → all sibling providers would balloon every one-provider
// commit into a category-wide regen.
let frontier = [...names]
while (frontier.length) {
  const next = []
  for (const name of frontier)
    for (const reexporter of reexportersByTarget.get(name) ?? [])
      if (!names.has(reexporter)) {
        names.add(reexporter)
        next.push(reexporter)
      }
  frontier = next
}

for (const name of [...names]) {
  const entry = registry.packages[name]
  for (const provider of providersByCore.get(name) ?? []) names.add(provider)
  if (entry.implements && registry.packages[entry.implements]) names.add(entry.implements)
  for (const feature of featuresByLocale.get(name) ?? []) names.add(feature)
}

if (names.size === 0) {
  console.error('✓ no registered packages in scope — nothing to regenerate')
  process.exit(0)
}

const docs = await generateDocs(registry, moleculeDir, names)
const written = []
for (const { readmePath, md } of docs) {
  // Compare with the generation timestamp stripped — it changes on every run, so
  // a raw comparison would rewrite and re-stage all ~900 docs on every commit.
  const existing = existsSync(readmePath) ? readFileSync(readmePath, 'utf-8') : null
  if (existing !== null && stripGeneratedTimestamp(existing) === stripGeneratedTimestamp(md)) {
    continue
  }
  if (!checkOnly) writeFileSync(readmePath, md)
  written.push(relative(moleculeDir, readmePath))
}

for (const file of written) console.log(file)

if (checkOnly && written.length > 0) {
  console.error(
    `✗ ${written.length}/${docs.length} README.md file(s) stale (scope: ${names.size} package(s))`,
  )
  console.error('Fix: cd mlcl && npm run sync-docs:changed')
  process.exit(1)
}
console.error(
  `✓ README.md ${checkOnly ? 'check' : 'regen'}: ${written.length} ${checkOnly ? 'stale' : 'updated'}, ` +
    `${docs.length - written.length} already in sync (scope: ${names.size} package(s))`,
)
