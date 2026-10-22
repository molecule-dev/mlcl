#!/usr/bin/env node
/**
 * Decide which changed package.json files can alter a generated README.
 *
 * The shared input to both docs scope selectors: the release's `docsGateFailures`
 * (scripts/release.mjs) and molecule's pre-commit README regen
 * (molecule/.husky/pre-commit). Both used to select a package on ANY
 * package.json change, so a fleet-wide test-tool pin made them regenerate/check
 * the whole ~1030-package fleet — over ten minutes per attempt (2026-10-22).
 * Both now ask this script, which applies `manifestChangeAffectsDocs` to the
 * manifest BEFORE and AFTER the change.
 *
 * `--registry` answers the same question for mlcl/registry.json: a toolchain or
 * pin-bump edit is not a docs input, a package-metadata edit is.
 *
 * Inputs are immutable git objects, never the working tree:
 *   --committed --old=<rev> --new=<rev>   compare the two commits' blobs
 *   --staged    --base=<rev>              compare the base commit's blob to the index
 *   --registry  --old=<rev> --new=<rev>   compare registry.json at two commits
 *
 * Usage:
 *   node scripts/doc-manifest-scope.mjs --committed --old=<rev> --new=<rev> \
 *     [--repo=<dir>] packages/.../package.json ...
 *   node scripts/doc-manifest-scope.mjs --staged --base=<rev> \
 *     [--repo=<dir>] packages/.../package.json ...
 *   node scripts/doc-manifest-scope.mjs --registry --old=<rev> --new=<rev> \
 *     [--repo=<dir>] [registry.json]
 *
 * Prints each path whose change affects docs, one per line, on STDOUT. A path
 * whose old or new blob cannot be read (added/deleted package, bad rev,
 * unreadable object) is printed — an unknown input widens the scope.
 *
 * Runs via tsx against mlcl SOURCE, same as regen-molecule-docs.mjs: the docs
 * subgraph imports no @molecule/* packages, so no build is needed.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'

import { manifestChangeAffectsDocs, registryChangeAffectsDocs } from '../src/lib/doc-inputs.js'

const argv = process.argv.slice(2)
const committed = argv.includes('--committed')
const staged = argv.includes('--staged')
const registryMode = argv.includes('--registry')
const flag = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1)
const repo = flag('--repo') ?? process.cwd()
const args = argv.filter((arg) => !arg.startsWith('--'))

if ([committed, staged, registryMode].filter(Boolean).length !== 1) {
  console.error(
    'Usage: doc-manifest-scope.mjs (--committed --old=<rev> --new=<rev> | --staged --base=<rev> | ' +
      '--registry --old=<rev> --new=<rev>) [--repo=<dir>] [<path> ...]',
  )
  process.exit(2)
}

const oldRev = registryMode ? flag('--old') : committed ? flag('--old') : flag('--base')
const newRev = registryMode ? flag('--new') : committed ? flag('--new') : ':0'
if (!oldRev || !newRev) {
  console.error(
    registryMode || committed
      ? `doc-manifest-scope.mjs ${registryMode ? '--registry' : '--committed'} needs --old=<rev> and --new=<rev>`
      : 'doc-manifest-scope.mjs --staged needs --base=<rev>',
  )
  process.exit(2)
}

/**
 * Read one blob from a git object expression, or `null` when it does not exist.
 *
 * `null` is deliberate: the caller treats an unreadable side as "unknown, keep
 * in scope". A `git show` that fails because the revision itself is wrong also
 * lands here, so a broken invocation widens the selection instead of silently
 * narrowing it.
 *
 * @param rev - A revision (`<rev>:<path>`) or index expression (`:0`).
 * @param path - The registry-relative package.json path.
 * @returns The blob contents, or null.
 */
function readBlob(rev, path) {
  try {
    return execFileSync('git', ['-C', repo, 'show', `${rev}:${path}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (_error) {
    // Missing object/revision: callers treat null as "unknown, keep in scope".
    return null
  }
}

if (registryMode) {
  const path = args[0] ?? 'registry.json'
  const before = readBlob(oldRev, path)
  const after = readBlob(newRev, path)
  if (before === null || after === null) {
    console.error(`doc-manifest-scope: could not read both sides of ${path} — keeping it in scope`)
    console.log(path)
  } else if (registryChangeAffectsDocs(before, after)) {
    console.log(path)
  }
  process.exit(0)
}

for (const path of args) {
  if (!path.endsWith('/package.json')) {
    console.log(path)
    continue
  }
  const before = readBlob(oldRev, path)
  const after = readBlob(newRev, path)
  if (before === null || after === null) {
    // Added/deleted package or unreadable blob: not knowable, so keep it.
    console.error(`doc-manifest-scope: could not read both sides of ${path} — keeping it in scope`)
    console.log(path)
    continue
  }
  if (manifestChangeAffectsDocs(before, after)) console.log(path)
}
