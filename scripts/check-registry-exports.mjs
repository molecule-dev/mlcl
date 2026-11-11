#!/usr/bin/env node
/**
 * Registry export-, route-, bond-setter- and response-record-drift gate.
 *
 * `registry.json` records each package's public exports, but the source of truth
 * — the actual `export`s in `molecule/packages/<path>/src` — lives in a SEPARATE
 * git repo (`molecule`). So a package whose exports change drifts the registry
 * silently: nothing in mlcl is touched, mlcl CI never checks out `molecule`, and
 * the only thing that reconciles them is a manual `sync-registry --scan-exports`.
 * (That is how 241 packages drifted before being resynced — incl. every component
 * package, whose `.tsx` re-exports were recorded as a bare `"*"`.)
 *
 * The same holds for a resource's declarative `routes` (`src/routes.ts`), and
 * there the registry copy is not merely a cache: a published package ships only
 * `dist/`, so at scaffold time in production the registry is the ONLY place a
 * route can come from — an entry that is stale or absent wires stale or NO
 * routes. (project's routes carried `authenticate`, the global auth marker,
 * for months → `Project.authenticate` TS2339 in every scaffold; 47 resources
 * carried no routes at all.)
 *
 * And for `bondSetter` — the setter a provider bond calls to register itself.
 * Its whole reason for existing is that the answer is NOT derivable from the
 * export list a consumer sees: `@molecule/app-http` exports `setAuthGate` and
 * `setClient`, and picking by order emitted `setAuthGate(provider)` into the
 * bond file of every scaffold shipping `app-http-axios`. A stale value here is
 * a broken import or a wrong registration in generated code, so a core whose
 * setter is renamed (or whose source grows one) has to fail THIS gate.
 *
 * And for `responseRecord` — the record a resource's API returns, read from the interface its
 * package exports (`Article`, not the stored `ArticleRow`). `mlcl create` types the app
 * module it writes for a resource from this copy, because a scaffold in production has only
 * `dist/`. A package that changes what it returns without a registry sync leaves every new
 * app typed from the old record: a field that became an array is still declared a string.
 *
 * This script is the gate that catches all of them. It re-runs the exact
 * comparisons `sync-registry --scan-exports` / `--scan-routes` use (scan `src`,
 * compare the SORTED export sets; compare the ORDERED route lists; compare the
 * scanned bond setter) and exits non-zero on any drift, naming the fix command.
 *
 * Usage:
 *   node scripts/check-registry-exports.mjs
 *       → check every registry package (full gate; ~3s — manual / CI).
 *   node scripts/check-registry-exports.mjs packages/app/features/foo packages/api/...
 *       → check only the given package paths (registry-relative `entry.path`);
 *         fast + concurrency-safe — used by molecule's pre-commit hook, which
 *         passes only the packages whose `src/` it is committing.
 *
 * Runs via tsx against mlcl SOURCE (not dist), so it needs no build — the
 * scanner/registry subgraph imports zero @molecule/* packages, which matters
 * pre-MVP: nothing is published yet, so mlcl cannot `tsc -b` in an mlcl-only CI
 * checkout (staging.ts imports unpublished @molecule type packages). Reading
 * source sidesteps that entirely. Invoke with tsx (`npm run verify:registry-exports`,
 * or `node_modules/.bin/tsx scripts/check-registry-exports.mjs`), never bare node.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resourceRecordName } from '../src/lib/app-resource-modules.js'
import { getRawRegistry, getRegistryPath } from '../src/lib/registry.js'
import { scanResponseRecord } from '../src/lib/response-record.js'
import {
  bondSetterScope,
  findMoleculePackages,
  ROUTE_SCANNED_TYPES,
  routesSignature,
  scanBondSetter,
  scanExports,
  scanForRoutes,
} from '../src/lib/scanner.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const mlclRoot = join(__dir, '..')

// Same resolution as sync-registry's refreshExports: MOLECULE_PACKAGES_DIR's
// parent, else the `molecule` sibling repo next to mlcl.
const moleculeDir = process.env.MOLECULE_PACKAGES_DIR
  ? join(process.env.MOLECULE_PACKAGES_DIR, '..')
  : join(mlclRoot, '..', 'molecule')

const registry = getRawRegistry()
const registryPath = getRegistryPath()

// Optional positional args scope the check to specific packages (registry-relative
// paths). Normalize trailing slashes so `packages/x/` and `packages/x` both match.
const scopePaths = new Set(process.argv.slice(2).map((p) => p.replace(/\/+$/, '')))

// Compare source packages TO the registry before iterating registry entries.
// Otherwise an omitted package is never visited and even an explicitly scoped
// pre-commit check reports success after checking zero packages. Deleted package
// paths are allowed: their manifests no longer exist in the source tree.
const packagePaths = scopePaths.size
  ? [...scopePaths]
  : (await findMoleculePackages(join(moleculeDir, 'packages'))).map((path) =>
      relative(moleculeDir, path),
    )
const unregistered = []
for (const path of packagePaths) {
  const manifestPath = join(moleculeDir, path, 'package.json')
  if (!existsSync(manifestPath)) continue
  const { name } = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!name?.startsWith('@molecule/')) continue
  const registeredPath = registry.packages[name]?.path
  if (!registeredPath || join(moleculeDir, registeredPath) !== join(moleculeDir, path))
    unregistered.push({ name, path, registeredPath })
}

const drifted = []
const routeDrifted = []
const setterDrifted = []
const peersDrifted = []
const recordDrifted = []
const bondSetterNames = bondSetterScope(registry.packages)
let checked = 0
let skipped = 0

for (const [name, entry] of Object.entries(registry.packages)) {
  if (scopePaths.size > 0 && !scopePaths.has(entry.path.replace(/\/+$/, ''))) continue

  const srcPath = join(moleculeDir, entry.path, 'src')
  let scanned
  try {
    scanned = await scanExports(srcPath)
  } catch (_error) {
    // No src/ dir (or scan failed) — same as refreshExports, which skips these.
    skipped++
    continue
  }
  checked++

  const have = [...(entry.exports ?? [])].sort()
  const want = [...scanned].sort()
  if (JSON.stringify(have) !== JSON.stringify(want)) {
    const missing = want.filter((x) => !have.includes(x))
    const extra = have.filter((x) => !want.includes(x))
    drifted.push({ name, missing, extra })
  }

  // Required @molecule peers, by sync-registry's own rule (refreshExports: non-optional @molecule/*
  // peerDependencies, sorted, always an array). Without it a commit that made api-resource a required
  // peer of api-resource-article passed this check and was refused only by the release's full
  // `sync-registry --check` (2026-11-07).
  const manifestPath = join(moleculeDir, entry.path, 'package.json')
  if (existsSync(manifestPath)) {
    let manifest = null
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch (_error) {
      // Unreadable manifest: sync-registry keeps the entry's peers too.
    }
    if (manifest) {
      const meta = manifest.peerDependenciesMeta ?? {}
      const wantPeers = Object.keys(manifest.peerDependencies ?? {})
        .filter((peer) => peer.startsWith('@molecule/') && meta[peer]?.optional !== true)
        .sort()
      const havePeers = Array.isArray(entry.moleculePeers) ? [...entry.moleculePeers].sort() : null
      if (JSON.stringify(havePeers) !== JSON.stringify(wantPeers))
        peersDrifted.push({ name, have: havePeers, want: wantPeers })
    }
  }

  // Declarative routes — only the types scanPackage scans (resource,
  // infrastructure), same comparison as sync-registry's refreshRoutes.
  if (ROUTE_SCANNED_TYPES.has(entry.type) && existsSync(srcPath)) {
    const scannedRoutes = await scanForRoutes(srcPath)
    if (routesSignature(entry.routes) !== routesSignature(scannedRoutes)) {
      routeDrifted.push({ name, have: entry.routes?.length ?? 0, want: scannedRoutes.length })
    }
  }

  // responseRecord — the same scan as sync-registry's refreshRecords, after the routes above
  // because the record is looked up by the name the collection route gives it.
  if (entry.type === 'resource' && existsSync(srcPath)) {
    const typesPath = join(srcPath, 'types.ts')
    const recordName = resourceRecordName(entry.routes ?? [])
    const scannedRecord =
      recordName && existsSync(typesPath)
        ? scanResponseRecord(readFileSync(typesPath, 'utf8'), [recordName])
        : null
    const haveRecord = entry.responseRecord ?? null
    if (JSON.stringify(haveRecord) !== JSON.stringify(scannedRecord)) {
      const fields = (record) =>
        new Map((record?.fields ?? []).map((f) => [f.name, `${f.optional ? '?' : ''}: ${f.type}`]))
      const have = fields(haveRecord)
      const want = fields(scannedRecord)
      const changed = [...new Set([...have.keys(), ...want.keys()])].filter(
        (field) => have.get(field) !== want.get(field),
      )
      recordDrifted.push({
        name,
        record: scannedRecord?.name ?? haveRecord?.name ?? recordName,
        changed: changed.map(
          (field) =>
            `${field}${have.get(field) ?? ' (absent)'} → ${field}${want.get(field) ?? ' (absent)'}`,
        ),
      })
    }
  }

  // bondSetter — same scope and scan as sync-registry's refreshExports, so a
  // core whose provider setter appears, moves or is renamed cannot slip through
  // with a stale (or missing) registry value.
  if (bondSetterNames.has(name) && existsSync(srcPath)) {
    const scannedSetter = await scanBondSetter(srcPath, scanned)
    const have = entry.bondSetter ?? null
    if (have !== scannedSetter) setterDrifted.push({ name, have, want: scannedSetter })
  }
}

if (unregistered.length > 0) {
  console.error(
    `\n✗ registry.json is missing source packages (${unregistered.length} package(s)):\n`,
  )
  for (const { name, path, registeredPath } of unregistered) {
    console.error(
      `  ${name}: ${path}` +
        (registeredPath ? ` (registry points to ${registeredPath})` : ' (not registered)'),
    )
  }
  console.error('\nFix: register the existing packages with mlcl init --force, then sync-registry')
}

if (drifted.length > 0) {
  console.error(`\n✗ registry.json exports are out of sync (${drifted.length} package(s)):\n`)
  for (const { name, missing, extra } of drifted) {
    const parts = []
    if (missing.length) parts.push(`missing ${JSON.stringify(missing)}`)
    if (extra.length) parts.push(`stale ${JSON.stringify(extra)}`)
    console.error(`  ${name}: ${parts.join(', ')}`)
  }
  console.error(`\nFix: cd mlcl && node bin/run.js sync-registry --scan-exports`)
}

if (routeDrifted.length > 0) {
  console.error(`\n✗ registry.json routes are out of sync (${routeDrifted.length} package(s)):\n`)
  for (const { name, have, want } of routeDrifted) {
    console.error(`  ${name}: registry has ${have} route(s), src/routes.ts yields ${want}`)
  }
  console.error(`\nFix: cd mlcl && node bin/run.js sync-registry --scan-routes`)
}

if (setterDrifted.length > 0) {
  console.error(
    `\n✗ registry.json bond setters are out of sync (${setterDrifted.length} package(s)):\n`,
  )
  for (const { name, have, want } of setterDrifted) {
    console.error(
      `  ${name}: registry has ${have === null ? 'none' : `"${have}"`}, src yields ` +
        `${want === null ? 'none' : `"${want}"`}`,
    )
  }
  console.error(`\nFix: cd mlcl && node bin/run.js sync-registry --scan-exports`)
}

if (peersDrifted.length > 0) {
  console.error(
    `\n✗ registry.json required @molecule peers are out of sync (${peersDrifted.length} package(s)):\n`,
  )
  for (const { name, have, want } of peersDrifted) {
    console.error(
      `  ${name}: registry has ${have === null ? 'none recorded' : JSON.stringify(have)}, ` +
        `package.json requires ${JSON.stringify(want)}`,
    )
  }
  console.error(`\nFix: cd mlcl && node bin/run.js sync-registry --scan-exports`)
}

if (recordDrifted.length > 0) {
  console.error(
    `\n✗ registry.json response records are out of sync (${recordDrifted.length} package(s)):\n`,
  )
  for (const { name, record, changed } of recordDrifted) {
    console.error(
      `  ${name} (${record}): ${changed.length ? changed.join('; ') : 'record added or removed'}`,
    )
  }
  console.error(
    '\nThe app module mlcl writes for a resource is typed from this record.' +
      '\nFix: cd mlcl && node bin/run.js sync-registry --scan-records',
  )
}

if (
  unregistered.length > 0 ||
  recordDrifted.length > 0 ||
  drifted.length > 0 ||
  routeDrifted.length > 0 ||
  setterDrifted.length > 0 ||
  peersDrifted.length > 0
) {
  console.error(`Then commit ${registryPath}\n`)
  process.exit(1)
}

const scope = scopePaths.size > 0 ? `${checked} scoped` : `${checked}`
console.log(
  `✓ registry exports + routes + bond setters + required peers + response records in sync (${scope} package(s) checked, ${skipped} skipped)`,
)
