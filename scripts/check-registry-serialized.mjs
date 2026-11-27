#!/usr/bin/env node
/**
 * The staged `registry.json` is stored exactly as `serializeRegistry` writes it.
 *
 * Every mlcl writer stores the registry through `serializeRegistry` (schema key order at every
 * depth, packages sorted by name), and `registry-schema.test.ts` asserts the committed bytes match.
 * That test runs in CI, after the push. A registry written any other way (a hand edit, a script's
 * `JSON.stringify`) committed fine until then: 2026-11-27 f5341d7ac9 added `intentHints` to two pending
 * entries right after `description` (the schema puts it after `path`), the release's pin writer moved
 * them verbatim into `packages`, and mlcl
 * CI failed on the pin commit. This check refuses such bytes at commit time and names the entries
 * whose keys are out of order, for a private-index commit too (it reads the index).
 *
 * Usage (from mlcl, via tsx):
 *   node --import tsx scripts/check-registry-serialized.mjs [--repo=<mlcl dir>]
 *
 * Exits 0 when the staged registry is canonical, 1 when it is not or cannot be read.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { serializeRegistry } from '../src/lib/registry.js'

const mlclRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoFlag = process.argv.slice(2).find((arg) => arg.startsWith('--repo='))
const repo = resolve(repoFlag ? repoFlag.slice('--repo='.length) : mlclRoot)

let text
try {
  text = execFileSync('git', ['-C', repo, 'show', ':registry.json'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  })
} catch (error) {
  console.error(`check-registry-serialized: cannot read the staged registry.json: ${error.message}`)
  process.exit(1)
}

let raw
try {
  raw = JSON.parse(text)
} catch (error) {
  console.error(`check-registry-serialized: the staged registry.json is not JSON: ${error.message}`)
  process.exit(1)
}

const canonical = serializeRegistry(raw)
if (text === canonical) process.exit(0)

const written = JSON.parse(canonical)
const moved = []
for (const section of ['packages', 'pendingPackages']) {
  for (const [name, entry] of Object.entries(raw[section] ?? {})) {
    const expected = written[section]?.[name]
    if (expected && JSON.stringify(entry) !== JSON.stringify(expected))
      moved.push(`${section}.${name}`)
  }
}
const where = moved.length
  ? `the keys of ${moved.join(', ')} are not in schema order`
  : 'its top-level order, package order or formatting differs'
console.error(
  `check-registry-serialized: the staged registry.json is not stored as serializeRegistry writes it (${where}). Write it with \`node bin/run.js sync-registry --scan-exports <package path>\`, or through serializeRegistry (src/lib/registry.ts) for a field sync-registry does not scan, then stage it again.`,
)
process.exit(1)
