#!/usr/bin/env node
/**
 * Refuse a registry.json commit that leaves a committed molecule README stale, or whose changed
 * entries describe molecule work that molecule HEAD does not have.
 *
 * A package's README is generated from its molecule source AND its mlcl registry entry, and the
 * two live in separate repos. molecule's pre-commit checks the README of every package a molecule
 * commit touches, but nothing checked the other direction: an mlcl commit that changes an entry
 * (a description, a runtime dependency, a new locale bond whose feature now lists it) left the
 * READMEs it changes stale until the release's docs gate refused the release. On 2026-11-22
 * `@molecule/app-locales-node-editor-panel` entered the registry at 18:50 and the feature's README
 * stayed stale for two hours, until the release refused it.
 *
 * This check compares registry.json at `--base` (default HEAD; the hook passes
 * MOL_PRECOMMIT_BASE) with the index, takes every package whose entry changed, and checks those
 * packages' READMEs, with the READMEs the regenerator adds for them (a core's providers, a
 * provider's core, a locale's feature, a re-exporter), at molecule HEAD against the staged
 * registry. molecule HEAD is the half a release pins; the molecule working tree may hold other
 * sessions' work. A registry edit that touches no entry (a version pin, the toolchain) checks
 * nothing and exports nothing.
 *
 * The same export then runs `check-registry-exports.mjs` over the changed entries (exports, peers,
 * dependencies, routes, descriptions) with the staged registry, and refuses each finding that the
 * base registry does not also have. `sync-registry` reads the molecule WORKING tree, which holds
 * other sessions' uncommitted work: on 2026-11-25 mlcl 14d45864c4 recorded uncommitted exports for
 * five tag-input packages and `@molecule/app-ui`, and the UI kit peers of six features, and the
 * release's registry gate (which reads molecule at a pinned commit) would have refused it. A finding
 * the base registry has too predates this commit (a molecule commit whose registry half has not
 * landed yet) and is reported, not refused.
 *
 * The fix it names lands the molecule half first: regenerate the READMEs (with the working-tree
 * registry, which holds the staged change), commit them in molecule, then commit registry.json.
 *
 * Usage (from mlcl, via tsx — the docs subgraph needs no build):
 *   node --import tsx scripts/check-registry-docs.mjs [--base=<rev>] [--repo=<mlcl dir>]
 *     [--molecule=<molecule dir>]
 *
 * Exits 0 when every README in scope matches, 1 when one is stale or the check could not run, and
 * 0 with a note when no molecule checkout sits beside mlcl (a standalone clone).
 *
 * @module
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { registryChangedPackages } from '../src/lib/doc-inputs.js'
import { companionLocaleFor, documentedRegistry } from '../src/lib/docs-sync.js'

const mlclRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1)
const repo = resolve(flag('--repo') ?? mlclRoot)
const moleculeDir = resolve(flag('--molecule') ?? join(mlclRoot, '..', 'molecule'))
const base = flag('--base') || 'HEAD'

if (!existsSync(join(moleculeDir, '.git'))) {
  console.error(`check-registry-docs: no molecule checkout at ${moleculeDir} — skipped`)
  process.exit(0)
}

/** git for the molecule repo: a hook's GIT_DIR / GIT_INDEX_FILE name mlcl's repo, never molecule's. */
const moleculeEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
)

/** A registry.json blob from mlcl (`<rev>:registry.json` or the index's `:registry.json`), or null. */
function readRegistry(spec) {
  try {
    return execFileSync('git', ['-C', repo, 'show', spec], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (_error) {
    // Unreadable: registryChangedPackages treats a missing side as "any README".
    return null
  }
}

const before = readRegistry(`${base}:registry.json`)
const after = readRegistry(':registry.json')
if (after === null) {
  // registry.json deleted or not staged: nothing to generate from.
  process.exit(0)
}
const changed = registryChangedPackages(before, after)
if (changed !== null && changed.length === 0) process.exit(0)

const now = documentedRegistry(JSON.parse(after))
let old = { packages: {} }
try {
  if (before !== null) old = documentedRegistry(JSON.parse(before))
} catch (_error) {
  // An unparseable base gave `changed === null`, so every package is in scope below.
}

const paths = new Set()
const addPath = (name) => {
  const entry = now.packages[name]
  if (entry?.path) paths.add(entry.path.replace(/\/+$/, ''))
}
// The entries themselves, by either side's path (a removed entry is judged where it was), for the
// entry check; null when this change is not limited to some entries.
const entryPaths =
  changed === null
    ? null
    : [
        ...new Set(
          changed
            .map((name) => (now.packages[name] ?? old.packages[name])?.path?.replace(/\/+$/, ''))
            .filter(Boolean),
        ),
      ]
if (changed === null) {
  for (const name of Object.keys(now.packages)) addPath(name)
  console.error(
    `check-registry-docs: this registry change can alter any README — checking all ${paths.size}`,
  )
} else {
  // The READMEs that list a changed entry, by the base and the staged registry's relations: a
  // provider's core, a core's providers, a locale's feature. The regenerator expands the same way,
  // but only from a package molecule HEAD carries, and a new locale bond's feature README changes
  // before the locale bond is committed in molecule.
  const relations = (reg) => {
    const byName = new Map()
    const link = (from, to) => byName.set(from, [...(byName.get(from) ?? []), to])
    for (const [name, entry] of Object.entries(reg.packages)) {
      if (entry.implements) {
        link(name, entry.implements)
        link(entry.implements, name)
      }
      const companion = companionLocaleFor(name, entry, reg)
      if (companion) link(companion, name)
    }
    return byName
  }
  const listed = [relations(old), relations(now)]
  for (const name of changed) {
    addPath(name)
    for (const byName of listed) for (const other of byName.get(name) ?? []) addPath(other)
  }
}
if (paths.size === 0 && entryPaths?.length === 0) process.exit(0)

const exportDir = mkdtempSync(join(dirname(moleculeDir), '.precommit-registry-docs-'))
const cleanup = () => rmSync(exportDir, { recursive: true, force: true })
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
  process.on(signal, () => {
    cleanup()
    process.exit(1)
  })

let status = 1
try {
  // The export sits beside the molecule checkout so a package's dependencies resolve as they do
  // in the checkout (scripts/lib/release-ci-gates.mjs, exportCommittedMolecule).
  const archive = spawnSync(
    'sh',
    ['-c', 'git -C "$1" archive HEAD | tar -x -C "$2"', 'sh', moleculeDir, exportDir],
    {
      env: moleculeEnv,
      encoding: 'utf8',
    },
  )
  if (archive.status !== 0)
    throw new Error(`could not export molecule HEAD: ${archive.stderr.trim()}`)
  const gates = join(mlclRoot, '..', 'scripts', 'lib', 'release-ci-gates.mjs')
  if (existsSync(gates)) {
    const { prepareDocsCheckTree } = await import(pathToFileURL(gates).href)
    prepareDocsCheckTree({ moleculeDir, treeDir: exportDir })
  } else if (existsSync(join(moleculeDir, 'node_modules'))) {
    symlinkSync(join(moleculeDir, 'node_modules'), join(exportDir, 'node_modules'), 'dir')
  }
  const registryFile = join(exportDir, '.staged-registry.json')
  writeFileSync(registryFile, after)
  const readmes = checkReadmes(registryFile)
  const entries = checkEntries(registryFile)
  if (readmes && entries) status = 0
} catch (error) {
  console.error(`✗ check-registry-docs: ${error.message}`)
} finally {
  cleanup()
}
process.exit(status)

/**
 * The READMEs in scope, regenerated at molecule HEAD from the staged registry.
 *
 * @param {string} registryFile - The staged registry, written into the export.
 * @returns {boolean} True when every one matches.
 */
function checkReadmes(registryFile) {
  // A package molecule HEAD does not carry yet has no committed README; its own molecule commit's
  // hook checks it.
  const scope = [...paths].filter((path) => existsSync(join(exportDir, path))).sort()
  const check =
    scope.length === 0
      ? { status: 0, stdout: '', stderr: '' }
      : spawnSync(
          process.execPath,
          [
            '--import',
            'tsx',
            join(mlclRoot, 'scripts', 'regen-molecule-docs.mjs'),
            '--check',
            ...scope,
          ],
          {
            cwd: mlclRoot,
            env: {
              ...moleculeEnv,
              MOLECULE_PACKAGES_DIR: join(exportDir, 'packages'),
              MLCL_REGISTRY_PATH: registryFile,
            },
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
          },
        )
  const stale = check.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('README.md'))
  if (check.status === 0) {
    console.error(
      `✓ check-registry-docs: ${scope.length} package README(s) at molecule HEAD match the staged registry.json`,
    )
  } else if (check.status === 1 && stale.length > 0) {
    const dirs = stale.map((file) => file.replace(/\/README\.md$/, ''))
    console.error(
      `✗ registry.json changes ${stale.length} molecule README(s) that molecule HEAD does not match yet:`,
    )
    for (const file of stale) console.error(`  ${file}`)
    console.error('Regenerate them, commit them in molecule, then commit registry.json:')
    console.error(
      `  (cd mlcl && node --import tsx scripts/regen-molecule-docs.mjs ${dirs.join(' ')})`,
    )
  } else {
    console.error(`✗ check-registry-docs: the README check did not run (exit ${check.status}):`)
    console.error(`${check.stderr}${check.stdout}`.trim().split('\n').slice(-20).join('\n'))
  }
  return check.status === 0
}

/**
 * The changed entries, checked against molecule HEAD by `check-registry-exports.mjs` with the staged
 * registry; a finding the base registry also has predates this commit.
 *
 * @param {string} registryFile - The staged registry, written into the export.
 * @returns {boolean} True unless the staged registry adds a finding, or the check could not run.
 */
function checkEntries(registryFile) {
  // A package molecule HEAD does not carry yet is not judged, as the release's gate skips it.
  const scope = entryPaths?.filter((path) => existsSync(join(exportDir, path))).sort()
  if (scope?.length === 0) return true
  const run = (file) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        join(mlclRoot, 'scripts', 'check-registry-exports.mjs'),
        ...(scope ?? []),
      ],
      {
        cwd: mlclRoot,
        env: {
          ...moleculeEnv,
          MOLECULE_PACKAGES_DIR: join(exportDir, 'packages'),
          MLCL_REGISTRY_PATH: file,
        },
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      },
    )
    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
      found: findings(result),
    }
  }
  const staged = run(registryFile)
  const count = scope
    ? `${scope.length} changed registry entr${scope.length === 1 ? 'y' : 'ies'}`
    : 'the registry'
  if (staged.status === 0) {
    console.error(`✓ check-registry-docs: ${count} match molecule HEAD`)
    return true
  }
  if (staged.found.size === 0) {
    console.error(
      `✗ check-registry-docs: the registry entry check did not run (exit ${staged.status}):`,
    )
    console.error(staged.output.trim().split('\n').slice(-20).join('\n'))
    return false
  }
  let base = new Set()
  if (before !== null) {
    const baseFile = join(exportDir, '.base-registry.json')
    writeFileSync(baseFile, before)
    const previous = run(baseFile)
    if (previous.status !== 0 && previous.found.size === 0) {
      console.error(
        `✗ check-registry-docs: the registry entry check did not run on the base (exit ${previous.status}):`,
      )
      console.error(previous.output.trim().split('\n').slice(-20).join('\n'))
      return false
    }
    base = previous.found
  }
  const added = [...staged.found].filter((finding) => !base.has(finding))
  if (added.length === 0) {
    console.error(
      `✓ check-registry-docs: ${count} add nothing molecule HEAD lacks (${staged.found.size} finding(s) predate this commit)`,
    )
    return true
  }
  console.error(
    `✗ registry.json records ${added.length} thing(s) that molecule HEAD does not have:`,
  )
  for (const finding of added) console.error(`  ${finding.replace('\n', ' ')}`)
  console.error(
    'Commit that work in molecule first, or leave those entries as they are at HEAD. sync-registry reads the molecule working tree, which holds uncommitted work; run it on an export of molecule HEAD (MOLECULE_PACKAGES_DIR) or on the package directories you committed.',
  )
  return false
}

/**
 * The findings in `check-registry-exports.mjs` output: each indented line under a `✗` heading, keyed by
 * the heading without its package count.
 *
 * @param {{ stdout: string, stderr: string }} result - The check's output.
 * @returns {Set<string>} `<heading>\n<finding>` for each finding.
 */
function findings({ stdout, stderr }) {
  const found = new Set()
  let heading = null
  for (const line of `${stdout}\n${stderr}`.split('\n')) {
    if (line.startsWith('✗ registry.json '))
      heading = line.replace(/\s*\(\d+ package\(s\)\):?\s*$/, '').slice(2)
    else if (heading && /^\s+\S/.test(line)) found.add(`${heading}\n${line.trim()}`)
  }
  return found
}
