#!/usr/bin/env node
/**
 * Every React feature that still renders DOM elements is refused in a React Native project.
 *
 * A React feature package is the implementation for React DOM and React Native both, once it renders
 * the renderer-neutral elements. molecule's `eslint-rules/intrinsic-jsx-pending.json` lists the
 * features that still render DOM tags (`<div>`, `<canvas>`); on a device those tags do not exist, so
 * such a feature installed into a React Native project builds and then fails to render. `mlcl add`
 * and `mlcl create` refuse a package in a React Native project only through the registry: its own
 * `webOnlyReason`, or a required peer (`moleculePeers`) that has one (`mind-map-canvas-react →
 * canvas-react`). This check holds the two together: every pending feature at molecule HEAD must be
 * refused by the registry being committed. A registry edit is the only way to lose a reason or a peer
 * chain, so it runs on every commit that stages `registry.json`.
 *
 * Usage (from mlcl, via tsx):
 *   node --import tsx scripts/check-react-native-refusals.mjs [--registry=<file>] [--repo=<mlcl dir>]
 *     [--rev=<rev>] [--molecule=<molecule dir>]
 *
 * `--registry` defaults to the `registry.json` in the index of `--repo` (this mlcl: what the commit
 * records); `--rev` is the
 * molecule revision whose pending list is read (default `HEAD`). Exits 0 when every pending feature
 * is refused, 1 when one is not or the check could not run, and 0 with a note when no molecule
 * checkout sits beside mlcl (a standalone clone).
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { clearRegistryCache, loadRegistry } from '../src/lib/registry.js'
import { unrefusedOnReactNative } from '../src/lib/web-only.js'

const mlclRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1)
const repo = resolve(flag('--repo') ?? mlclRoot)
const moleculeDir = resolve(flag('--molecule') ?? join(mlclRoot, '..', 'molecule'))
const rev = flag('--rev') || 'HEAD'
const PENDING = 'eslint-rules/intrinsic-jsx-pending.json'

if (!existsSync(join(moleculeDir, '.git'))) {
  console.error(`check-react-native-refusals: no molecule checkout at ${moleculeDir} — skipped`)
  process.exit(0)
}

/** git for the molecule repo: a hook's GIT_DIR / GIT_INDEX_FILE name mlcl's repo, never molecule's. */
const moleculeEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
)
const showMolecule = (path) =>
  execFileSync('git', ['-C', moleculeDir, 'show', `${rev}:${path}`], {
    encoding: 'utf8',
    env: moleculeEnv,
    maxBuffer: 64 * 1024 * 1024,
  })

const scratch = mkdtempSync(join(tmpdir(), 'mlcl-rn-refusals-'))
let status = 1
try {
  const registryFile = flag('--registry')
    ? resolve(flag('--registry'))
    : join(scratch, 'registry.json')
  if (!flag('--registry'))
    writeFileSync(
      registryFile,
      execFileSync('git', ['-C', repo, 'show', ':registry.json'], {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      }),
    )
  const pending = JSON.parse(showMolecule(PENDING))
  if (!Array.isArray(pending.features))
    throw new Error(`${PENDING} at ${rev} has no "features" list`)
  // Each entry is a directory under packages/app/features/; its package.json names the package.
  const names = pending.features.map(
    (dir) => JSON.parse(showMolecule(`packages/app/features/${dir}/package.json`)).name,
  )
  process.env.MLCL_REGISTRY_PATH = registryFile
  clearRegistryCache()
  const byName = new Map(loadRegistry().map((pkg) => [pkg.name, pkg]))
  const missing = names.filter((name) => !byName.has(name))
  const unrefused = unrefusedOnReactNative(
    names.filter((name) => byName.has(name)),
    byName,
  )
  for (const name of missing)
    console.error(`✗ ${name} renders DOM elements (${PENDING}) and has no registry entry`)
  for (const name of unrefused)
    console.error(
      `✗ ${name} renders DOM elements (${PENDING}) but a React Native project can install it: give its registry entry a webOnlyReason, or convert it to the renderer-neutral elements and remove it from the pending list`,
    )
  if (missing.length === 0 && unrefused.length === 0) {
    console.error(
      `check-react-native-refusals: ${names.length} DOM-rendering feature(s), each refused in a React Native project`,
    )
    status = 0
  }
} catch (error) {
  console.error(`✗ check-react-native-refusals: ${error.message}`)
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
process.exit(status)
