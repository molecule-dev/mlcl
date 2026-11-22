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
 * And for `description` — npm shows the package.json copy and mlcl search, the MCP server and
 * Synthase rank by the registry copy. Two hand-written texts had drifted apart in 298 packages, so
 * the registry copy is the manifest's, scanned like the required peers.
 *
 * And for `runtimeDependencies` — every package.json dependency and peer, by name. molecule-dev's
 * install and plan guards read it to map a third-party library to the package that wraps it, and
 * the README's install line lists it. A manifest change the registry missed (five framework
 * bindings gained their optional routing-bond peers on 2026-11-22) passed this gate and was
 * refused only by the release's full `sync-registry --check`.
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
 *   node scripts/check-registry-exports.mjs --fallback-registry=<path> <package paths>…
 *       → a package also passes when its entry in <path> agrees with its source. The hook
 *         passes mlcl HEAD's registry: the working-tree registry is shared, and another
 *         session's uncommitted entry for the same package refused a commit that changed none
 *         of its exports (2026-11-20, app-ui-react). A package neither registry agrees with
 *         is still refused.
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
  declarationScope,
  findMoleculePackages,
  registryPackageSrc,
  ROUTE_SCANNED_TYPES,
  routesSignature,
  scanBondSetter,
  scanDeclarations,
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
// A package awaiting its first release is declared under `pendingPackages` until the release moves it into
// `packages`. It is source in this tree like any other, so it counts as registered and its entry is checked the
// same way. An entry in both maps keeps its installable declaration (as docs-sync's documentedRegistry reads them).
const entries = { ...(registry.pendingPackages ?? {}), ...registry.packages }

// Optional positional args scope the check to specific packages (registry-relative
// paths). Normalize trailing slashes so `packages/x/` and `packages/x` both match.
const args = process.argv.slice(2)
const fallbackPath = args
  .find((a) => a.startsWith('--fallback-registry='))
  ?.slice('--fallback-registry='.length)
// The fallback registry's entries, read the same way (a pending package counts as registered).
const fallbackEntries = fallbackPath
  ? (() => {
      const raw = JSON.parse(readFileSync(fallbackPath, 'utf8'))
      return { ...(raw.pendingPackages ?? {}), ...raw.packages }
    })()
  : null
const scopePaths = new Set(
  args.filter((a) => !a.startsWith('--')).map((p) => p.replace(/\/+$/, '')),
)
// A scoped path with no manifest counts as a deleted package, so one in another shape
// (`../molecule/packages/…`, absolute, a package name) would be checked as nothing and pass.
const misshapen = [...scopePaths].filter((p) => {
  const segments = p.split('/')
  return (
    segments[0] !== 'packages' ||
    segments.length < 2 ||
    segments.some((x) => x === '' || x === '.' || x === '..')
  )
})
if (misshapen.length) {
  console.error(
    `✗ check-registry-exports: scoped paths are package directories relative to the molecule root (packages/<stack>/<group>/<name>), not: ${misshapen.join(', ')}`,
  )
  process.exit(2)
}

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
  const { name, private: isPrivate } = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!name?.startsWith('@molecule/')) continue
  // A private package (a workspace-only test kit) is never published, so mlcl
  // can never install it and the registry must not list it.
  if (isPrivate === true) continue
  const registeredAt = (map) =>
    Boolean(map?.[name]?.path) && join(moleculeDir, map[name].path) === join(moleculeDir, path)
  if (!registeredAt(entries) && !registeredAt(fallbackEntries))
    unregistered.push({ name, path, registeredPath: entries[name]?.path })
}

const drifted = []
const routeDrifted = []
const setterDrifted = []
const peersDrifted = []
const descriptionsDrifted = []
const dependenciesDrifted = []
const recordDrifted = []
const declarationsDrifted = []
const bondSetterNames = bondSetterScope(entries)
const packageSrc = registryPackageSrc(entries, moleculeDir)
const declared = declarationScope(entries)
let checked = 0
let skipped = 0

// A package whose index re-exports a scoped package's root (`export * from '@molecule/app-react'`)
// lists that package's names in its own entry (scanExports follows the star), so a change to the
// scoped package stales the re-exporter too: check it in the same run, transitively.
const checkPaths = new Set(scopePaths)
const reexported = new Set(
  Object.entries(entries)
    .filter(([, entry]) => scopePaths.has(entry.path.replace(/\/+$/, '')))
    .map(([name]) => name),
)
for (let grew = reexported.size > 0; grew;) {
  grew = false
  for (const [name, entry] of Object.entries(entries)) {
    const path = entry.path.replace(/\/+$/, '')
    if (checkPaths.has(path)) continue
    const indexPath = join(moleculeDir, path, 'src/index.ts')
    if (!existsSync(indexPath)) continue
    const stars = readFileSync(indexPath, 'utf8').matchAll(
      /export\s+\*\s+from\s+'(@molecule\/[^'/]+)'/g,
    )
    if ([...stars].some(([, specifier]) => reexported.has(specifier))) {
      checkPaths.add(path)
      reexported.add(name)
      grew = true
    }
  }
}

/**
 * One package's drift against one registry entry, pushed onto `sink`'s lists.
 *
 * @param {string} name - The package name.
 * @param {object} entry - Its registry entry.
 * @param {Record<string, object[]>} sink - The drift lists to push onto.
 * @returns {Promise<boolean>} False when the package has no scannable `src/` (skipped, as
 *   refreshExports skips it).
 */
async function checkEntry(name, entry, sink) {
  const srcPath = join(moleculeDir, entry.path, 'src')
  let scanned
  try {
    scanned = await scanExports(srcPath, packageSrc)
  } catch (_error) {
    // No src/ dir (or scan failed) — same as refreshExports, which skips these.
    return false
  }

  const have = [...(entry.exports ?? [])].sort()
  const want = [...scanned].sort()
  if (JSON.stringify(have) !== JSON.stringify(want)) {
    const missing = want.filter((x) => !have.includes(x))
    const extra = have.filter((x) => !want.includes(x))
    sink.drifted.push({ name, missing, extra })
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
        sink.peersDrifted.push({ name, have: havePeers, want: wantPeers })
      // runtimeDependencies, by sync-registry's own rule: dependencies and peers, every name, sorted.
      const wantDeps = [
        ...new Set([
          ...Object.keys(manifest.dependencies ?? {}),
          ...Object.keys(manifest.peerDependencies ?? {}),
        ]),
      ].sort()
      const haveDeps = [...(entry.runtimeDependencies ?? [])].sort()
      if (JSON.stringify(haveDeps) !== JSON.stringify(wantDeps))
        sink.dependenciesDrifted.push({
          name,
          missing: wantDeps.filter((dep) => !haveDeps.includes(dep)),
          extra: haveDeps.filter((dep) => !wantDeps.includes(dep)),
        })
      // The description, by sync-registry's own rule: the manifest's text when it has one.
      if (
        typeof manifest.description === 'string' &&
        manifest.description.trim() !== '' &&
        entry.description !== manifest.description
      )
        sink.descriptionsDrifted.push({ name, have: entry.description, want: manifest.description })
    }
  }

  // Declarative routes — only the types scanPackage scans (resource,
  // infrastructure), same comparison as sync-registry's refreshRoutes.
  if (ROUTE_SCANNED_TYPES.has(entry.type) && existsSync(srcPath)) {
    const scannedRoutes = await scanForRoutes(srcPath)
    if (routesSignature(entry.routes) !== routesSignature(scannedRoutes)) {
      sink.routeDrifted.push({ name, have: entry.routes?.length ?? 0, want: scannedRoutes.length })
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
      sink.recordDrifted.push({
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
    if (have !== scannedSetter) sink.setterDrifted.push({ name, have, want: scannedSetter })
  }

  // declarations — same scope and scan as sync-registry's refreshExports. A changed type a
  // generated bond file shows is a stale signature in every new scaffold; a requested name the
  // source does not declare would show nothing.
  if (existsSync(srcPath)) {
    const names = declared.get(name) ?? []
    const want = names.length ? await scanDeclarations(srcPath, names) : {}
    const have = entry.declarations ?? {}
    const unresolved = names.filter((n) => !(n in want))
    const stale = [...new Set([...Object.keys(have), ...Object.keys(want)])].filter(
      (n) => have[n] !== want[n],
    )
    if (unresolved.length || stale.length)
      sink.declarationsDrifted.push({ name, unresolved, stale })
  }
  return true
}

const DRIFT_LISTS = [
  'drifted',
  'routeDrifted',
  'setterDrifted',
  'peersDrifted',
  'descriptionsDrifted',
  'dependenciesDrifted',
  'recordDrifted',
  'declarationsDrifted',
]
const newSink = () => Object.fromEntries(DRIFT_LISTS.map((list) => [list, []]))
const drifts = (sink) => DRIFT_LISTS.some((list) => sink[list].length > 0)
const totals = {
  drifted,
  routeDrifted,
  setterDrifted,
  peersDrifted,
  descriptionsDrifted,
  dependenciesDrifted,
  recordDrifted,
  declarationsDrifted,
}
// Packages whose entry only the fallback registry agrees with.
const pairedWithFallback = []
for (const [name, entry] of Object.entries(entries)) {
  if (scopePaths.size > 0 && !checkPaths.has(entry.path.replace(/\/+$/, ''))) continue
  const sink = newSink()
  if (!(await checkEntry(name, entry, sink))) {
    skipped++
    continue
  }
  checked++
  const fallback = fallbackEntries?.[name]
  if (drifts(sink) && fallback?.path === entry.path) {
    const again = newSink()
    await checkEntry(name, fallback, again)
    if (!drifts(again)) {
      pairedWithFallback.push(name)
      continue
    }
  }
  for (const list of DRIFT_LISTS) totals[list].push(...sink[list])
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

if (declarationsDrifted.length > 0) {
  console.error(
    `\n✗ registry.json bond-file declarations are out of sync (${declarationsDrifted.length} package(s)):\n`,
  )
  for (const { name, unresolved, stale } of declarationsDrifted) {
    const parts = []
    if (stale.length) parts.push(`stale ${JSON.stringify(stale)}`)
    if (unresolved.length)
      parts.push(
        `no exported interface/type/enum/function/class/typed const for ${JSON.stringify(unresolved)} (fix the declare list)`,
      )
    console.error(`  ${name}: ${parts.join(', ')}`)
  }
  console.error(`\nFix: cd mlcl && node bin/run.js sync-registry --scan-exports`)
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

if (descriptionsDrifted.length > 0) {
  console.error(
    `\n✗ registry.json descriptions are out of sync (${descriptionsDrifted.length} package(s)):\n`,
  )
  for (const { name, have, want } of descriptionsDrifted) {
    console.error(
      `  ${name}: registry has ${JSON.stringify(have)}, package.json has ${JSON.stringify(want)}`,
    )
  }
  console.error(
    '\nnpm shows the package.json text and mlcl search ranks by the registry one; they are one text.' +
      '\nFix: cd mlcl && node bin/run.js sync-registry --scan-exports',
  )
}

if (dependenciesDrifted.length > 0) {
  console.error(
    `\n✗ registry.json runtime dependencies are out of sync (${dependenciesDrifted.length} package(s)):\n`,
  )
  for (const { name, missing, extra } of dependenciesDrifted) {
    const parts = []
    if (missing.length) parts.push(`missing ${JSON.stringify(missing)}`)
    if (extra.length) parts.push(`stale ${JSON.stringify(extra)}`)
    console.error(`  ${name}: ${parts.join(', ')}`)
  }
  console.error(
    '\nThe registry lists every package.json dependency and peer of a package.' +
      '\nFix: cd mlcl && node bin/run.js sync-registry --scan-exports',
  )
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
  declarationsDrifted.length > 0 ||
  peersDrifted.length > 0 ||
  descriptionsDrifted.length > 0 ||
  dependenciesDrifted.length > 0
) {
  console.error(`Then commit ${registryPath}\n`)
  process.exit(1)
}

if (pairedWithFallback.length > 0)
  console.log(
    `ℹ ${pairedWithFallback.join(', ')}: in sync with ${fallbackPath}, not ${registryPath}, whose entry carries a change no commit has made yet`,
  )
const scope = scopePaths.size > 0 ? `${checked} scoped` : `${checked}`
console.log(
  `✓ registry exports + routes + bond setters + bond-file declarations + required peers + runtime dependencies + descriptions + response records in sync (${scope} package(s) checked, ${skipped} skipped)`,
)
