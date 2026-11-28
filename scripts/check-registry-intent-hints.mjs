#!/usr/bin/env node
/**
 * The staged `registry.json` passes the intent-hint rules (`intentHintReport`).
 *
 * CI runs `sync-registry --check-intent-hints` after the push, and mlcl's test suite runs the same
 * rules, so an entry that breaks them committed fine until then. 2026-11-28: a pending declaration
 * for an internal package (no hints, no `ui.hidden`) was committed, and the release's mlcl suite
 * refused publish-mlcl on it. This check refuses such an entry at commit time and names it, for a
 * private-index commit too (it reads the index).
 *
 * Usage (from mlcl, via tsx):
 *   node --import tsx scripts/check-registry-intent-hints.mjs [--repo=<mlcl dir>]
 *
 * Exits 0 when the staged registry passes, 1 when it does not or cannot be read.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { intentHintReport } from '../src/lib/intent-hints.js'

const mlclRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoFlag = process.argv.slice(2).find((arg) => arg.startsWith('--repo='))
const repo = resolve(repoFlag ? repoFlag.slice('--repo='.length) : mlclRoot)

let registry
try {
  const text = execFileSync('git', ['-C', repo, 'show', ':registry.json'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  })
  registry = JSON.parse(text)
} catch (error) {
  console.error(
    `check-registry-intent-hints: cannot read the staged registry.json: ${error.message}`,
  )
  process.exit(1)
}

const { violations } = intentHintReport(registry)
if (violations.length === 0) process.exit(0)
console.error(
  `check-registry-intent-hints: the staged registry.json breaks ${violations.length} intent-hint rule(s):`,
)
for (const { subject, message } of violations) console.error(`  ✗ ${subject}: ${message}`)
console.error(
  'Author `intentHints` (at most 8, lowercase), or set `ui.hidden` on a package no app picks directly.',
)
process.exit(1)
