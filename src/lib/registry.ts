/**
 * Registry loader — reads the centralized molecule registry.
 *
 * Reads mlcl/registry.json, the single source of truth for all package metadata.
 *
 * @module
 */

import { readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { t } from './i18n.js'
import {
  type ApiFrameworkConfig,
  type AppFrameworkConfig,
  type InferredPackage,
  type MoleculeMetadata,
  type PackageType,
  type Registry,
  Registry as RegistrySchema,
  type RegistryEntry,
  type StagingDriverRegistryEntry,
} from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Default path to the centralized registry file (mlcl/registry.json). */
const DEFAULT_REGISTRY_PATH = join(__dirname, '..', '..', 'registry.json')

/**
 * Resolve the registry file path.
 *
 * Honors the `MLCL_REGISTRY_PATH` environment override so tests (and advanced
 * multi-registry workflows) can point every reader/writer at an alternate file
 * without mutating the real `registry.json`; falls back to the default. Resolved
 * per-call (not memoized) so an override set after module load is respected.
 */
function registryFilePath(): string {
  return process.env.MLCL_REGISTRY_PATH ?? DEFAULT_REGISTRY_PATH
}

// ============================================================================
// Primary: Centralized Registry
// ============================================================================

/**
 * The derived `InferredPackage[]`, keyed by the parsed registry it came FROM
 * (plus the path that parse belongs to).
 *
 * The path is part of the key because {@link registryFilePath} is resolved per
 * call — the module's own contract is that a `MLCL_REGISTRY_PATH` set after
 * module load (the multi-registry workflow the override exists for, and every
 * test that points a reader at an alternate file) is respected. A bare
 * `InferredPackage[] | null` answered the SECOND path from the FIRST path's
 * cache: the caller asked one file and silently got another registry.
 *
 * `source` is the registry OBJECT {@link rawRegistryAt} handed back, so this
 * cache follows that one's invalidation instead of tracking the file itself:
 * one read, one `JSON.parse` and one zod validation of the fleet-sized registry
 * per (path, mtime, size) — shared by every reader in the process, instead of
 * one parse per READER (see {@link rawRegistryAt}).
 *
 * `moleculeDir` is part of the key for the SAME reason `path` is: the derived
 * entries carry `path: join(moleculeDir, entry.path)`, and
 * {@link resolveMoleculeDir} reads `MOLECULE_PACKAGES_DIR` per call — so a
 * `MOLECULE_PACKAGES_DIR` set after a first load must re-derive, or the second
 * caller is handed the FIRST directory's paths (an entry's `path` pointing into
 * a packages tree the environment no longer names).
 */
let _cache: {
  source: Registry
  path: string
  moleculeDir: string
  packages: InferredPackage[]
} | null = null

function resolveMoleculeDir(): string {
  if (process.env.MOLECULE_PACKAGES_DIR) {
    // MOLECULE_PACKAGES_DIR points to molecule/packages, go up one level
    return join(process.env.MOLECULE_PACKAGES_DIR, '..')
  }
  return join(__dirname, '..', '..', '..', 'molecule')
}

/**
 * Derive the `InferredPackage[]` view of an already-parsed registry.
 *
 * `moleculeDir` is passed in rather than resolved here so the caller can key
 * its cache on the same value it derives from — see {@link loadRegistry}.
 *
 * @param registry - The parsed registry.
 * @param moleculeDir - The molecule monorepo root the entries' paths hang off.
 */
function derivePackages(registry: Registry, moleculeDir: string): InferredPackage[] {
  return Object.entries(registry.packages)
    .map(([name, entry]) => ({
      name,
      version: '0.0.0',
      description: entry.description,
      dependencies: {},
      peerDependencies: {},
      type: entry.type as PackageType,
      routes: entry.routes ?? [],
      tables: (entry.tables ?? []).map((t) => ({ name: t.name, sqlFile: t.sqlFile })),
      exports: entry.exports ?? [],
      molecule: entry as unknown as MoleculeMetadata,
      path: join(moleculeDir, entry.path),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Load all packages for a given project type.
 *
 * The returned packages are derived from {@link rawRegistryAt} — the single
 * file-identity-keyed parse of the registry file — so a process that reads both
 * this and any {@link getRawRegistry} accessor (`loadAppFrameworks`,
 * `getMoleculeVersion`, …) parses the file once, not once per reader.
 *
 * A MISSING registry file throws here (as it always has): an empty package list
 * is a valid registry, so callers cannot tell "no fleet" from "no registry
 * file", and every caller treats an empty list as a legitimate answer.
 *
 * @param projectType - 'api' or 'app' (optional — returns all if omitted)
 */
export function loadRegistry(projectType?: 'api' | 'app'): InferredPackage[] {
  const path = registryFilePath()
  const { registry, present } = rawRegistryAt(path)
  if (!present) {
    // Loud, as the readFileSync ENOENT this replaced was: mlcl without its
    // registry is a broken install, and silently answering "no packages" would
    // turn every resolution failure into "nothing to do".
    throw new Error(`Registry not found: ${path}`)
  }
  const moleculeDir = resolveMoleculeDir()
  if (
    !_cache ||
    _cache.source !== registry ||
    _cache.path !== path ||
    _cache.moleculeDir !== moleculeDir
  ) {
    _cache = {
      source: registry,
      path,
      moleculeDir,
      packages: derivePackages(registry, moleculeDir),
    }
  }

  const packages = _cache.packages
  if (!projectType) return packages
  return packages.filter((entry) => {
    const stack = entry.molecule?.stack
    return stack === projectType
  })
}

/**
 * Clear the cached registry (useful in tests).
 */
export function clearRegistryCache(): void {
  _cache = null
  rawRegistryCache.clear()
}

/**
 * Look up a single package in the registry by name.
 */
export function findRegistryPackage(name: string): InferredPackage | undefined {
  const all = loadRegistry()
  return all.find((p) => p.name === name)
}

/**
 * Get the stack for a package from registry metadata (not name parsing).
 * Falls back to name-based inference for packages not in the registry.
 */
export function getPackageStack(name: string): 'api' | 'app' | undefined {
  const pkg = findRegistryPackage(name)
  const stack = pkg?.molecule?.stack
  if (stack === 'api' || stack === 'app') return stack
  // Fallback for packages not in the registry
  if (name.startsWith('@molecule/api-')) return 'api'
  if (name.startsWith('@molecule/app-')) return 'app'
  return undefined
}

/**
 * Find a package by its role (stack + type + category) in the registry.
 *
 * Used by the injector to resolve infrastructure and core package names
 * at generation time instead of hardcoding them.
 */
export function findPackageByRole(
  stack: 'api' | 'app',
  type: string,
  category: string,
): string | undefined {
  const all = loadRegistry()
  const match = all.find((p) => {
    const mol = p.molecule as Record<string, unknown> | undefined
    return mol?.stack === stack && mol?.type === type && mol?.category === category
  })
  return match?.name
}

/**
 * Find a package by its role or throw if not found.
 *
 * Unlike findPackageByRole, this never silently falls back to a hardcoded name.
 * If the registry is missing the expected entry, it fails loudly so the
 * registry can be fixed — keeping it as the single source of truth.
 */
export function requirePackageByRole(
  stack: 'api' | 'app' | string,
  type: string,
  category: string,
): string {
  const name = findPackageByRole(stack as 'api' | 'app', type, category)
  if (!name) {
    throw new Error(t('lib.registry.errors.missingRole', { stack, type, category }))
  }
  return name
}

// ============================================================================
// Registry Mutation (used by mlcl init, sync-registry, etc.)
// ============================================================================

/**
 * The file state a read-modify-write cycle saw when it READ the registry, and
 * the state the publish step therefore expects the file to still have. Keyed on
 * `mtimeNs` (nanosecond — `mtimeMs` rounds to a millisecond, which two writes
 * inside the same millisecond share) plus size, both read through the bigint
 * stat variant so the nanosecond field is typed.
 */
interface RegistryStamp {
  mtimeNs: bigint
  size: bigint
}

/** The registry file's current {@link RegistryStamp}, or null when it does not exist. */
function registryStamp(path: string): RegistryStamp | null {
  try {
    const stat = statSync(path, { bigint: true })
    return { mtimeNs: stat.mtimeNs, size: stat.size }
  } catch (_error) {
    // No registry file at this path.
    return null
  }
}

/**
 * Read the registry for a read-modify-write cycle, together with the
 * {@link RegistryStamp} the publish step will compare against.
 *
 * The stamp is taken BEFORE the read: a write that lands between the two is
 * exactly the concurrent update the stamp comparison must catch (the read then
 * returns bytes the stamp does not describe, so publishing is refused and the
 * caller re-reads).
 */
function readRegistryWithStamp(): { registry: Registry; stamp: RegistryStamp | null } {
  const path = registryFilePath()
  const stamp = registryStamp(path)
  if (stamp === null) {
    return { registry: { version: 1, packages: {} }, stamp: null }
  }
  return { registry: RegistrySchema.parse(JSON.parse(readFileSync(path, 'utf-8'))), stamp }
}

/** Raised when the registry file changed between this caller's read and its publish. */
class RegistryConcurrentUpdateError extends Error {}

/** Read-modify-write attempts before a persistently contested registry fails loudly. */
const REGISTRY_WRITE_ATTEMPTS = 5

/**
 * Apply a mutation to the registry with optimistic concurrency control.
 *
 * The naive cycle — read, mutate in memory, write — silently DROPS a concurrent
 * writer's entry: two parallel `mlcl init` runs both read the same file, both
 * add their package and publish, and the second rename replaces the first
 * writer's entry with a file that never saw it. Every later
 * `requirePackageByRole` for the dropped package then fails with "missing
 * role". The publish step therefore re-checks the file's stamp immediately
 * before the rename and refuses when another writer landed first; this loop
 * answers that refusal by re-reading (picking up the other writer's entry) and
 * re-applying, up to {@link REGISTRY_WRITE_ATTEMPTS} times — a persistently
 * contested registry (a runaway writer) fails loudly instead of clobbering.
 *
 * @param apply - The mutation, applied to a freshly-read registry per attempt.
 */
function mutateRegistry(apply: (registry: Registry) => void): void {
  let lastConflict: RegistryConcurrentUpdateError | null = null
  for (let attempt = 0; attempt < REGISTRY_WRITE_ATTEMPTS; attempt++) {
    const { registry, stamp } = readRegistryWithStamp()
    apply(registry)
    try {
      writeRegistry(stamp, registry)
      return
    } catch (error) {
      if (!(error instanceof RegistryConcurrentUpdateError)) throw error
      lastConflict = error
    }
  }
  throw new Error(
    `${registryFilePath()} kept changing while the update was being applied ` +
      `(${REGISTRY_WRITE_ATTEMPTS} attempts, last conflict: ${String(lastConflict)}) — ` +
      `another mlcl process is writing it; re-run the command`,
  )
}

function writeRegistry(stamp: RegistryStamp | null, registry: Registry): void {
  // Sort packages alphabetically for deterministic output
  const sorted: Registry = {
    version: registry.version,
    ...(registry.typeDefaults ? { typeDefaults: registry.typeDefaults } : {}),
    packages: Object.fromEntries(
      Object.entries(registry.packages).sort(([a], [b]) => a.localeCompare(b)),
    ),
    ...(registry.apiFrameworks ? { apiFrameworks: registry.apiFrameworks } : {}),
    ...(registry.appFrameworks ? { appFrameworks: registry.appFrameworks } : {}),
    ...(registry.stagingDrivers ? { stagingDrivers: registry.stagingDrivers } : {}),
    ...(registry.toolchain ? { toolchain: registry.toolchain } : {}),
    ...(registry.moleculeVersions ? { moleculeVersions: registry.moleculeVersions } : {}),
    ...(registry.themePresets ? { themePresets: registry.themePresets } : {}),
  }
  // Publish by rename from a temp file in the SAME directory, never by an
  // in-place writeFileSync: an in-place write truncates registry.json first
  // and then writes, so a crash (or a full disk) between the two leaves a
  // truncated file that every mlcl command's parse fails on, with no backup.
  // rename is atomic on the same filesystem, so a failure before it leaves
  // the original bytes untouched. The pid in the temp name keeps parallel
  // mlcl processes from renaming each other's half-written file.
  //
  // The stamp check immediately before the rename is the optimistic-concurrency
  // gate {@link mutateRegistry} retries on: the file must still be in the state
  // the caller read it in, or the rename would silently REPLACE another
  // process's just-published entry with a file that never saw it.
  const target = registryFilePath()
  const temp = `${target}.${process.pid}.tmp`
  try {
    writeFileSync(temp, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
    const current = registryStamp(target)
    const changed =
      current === null
        ? stamp !== null
        : stamp === null || current.mtimeNs !== stamp.mtimeNs || current.size !== stamp.size
    if (changed) {
      throw new RegistryConcurrentUpdateError(
        `${target} changed after it was read (${String(stamp)} → ${String(current)})`,
      )
    }
    renameSync(temp, target)
  } catch (error) {
    // The temp file may exist partially written (or not at all) — remove it so
    // a failed publish leaves no litter next to the registry.
    try {
      rmSync(temp, { force: true })
    } catch (_cleanupError) {
      // Cleanup of OUR OWN temp file is best-effort: the registry itself is
      // intact (the destructive step never ran), and a leftover `${pid}.tmp`
      // is inert. Failing here would only mask the original write error.
    }
    throw error
  }
  clearRegistryCache()
}

/**
 * Add or update a package entry in the registry.
 *
 * Runs through {@link mutateRegistry}: a concurrent writer's entry is picked up
 * by the re-read instead of being dropped by this publish.
 */
export function updateRegistryEntry(packageName: string, entry: RegistryEntry): void {
  mutateRegistry((registry) => {
    registry.packages[packageName] = entry
  })
}

/**
 * Parsed-registry cache for {@link getRawRegistry}.
 *
 * Every framework/toolchain/version accessor funnels through getRawRegistry —
 * {@link getMoleculeVersion} among them, which scaffold and inject call once
 * per DEPENDENCY — and each call used to re-read and re-parse the whole
 * registry file. At ~900 packages (1.5 MB) that is ~27 ms per call, so one
 * scaffold paid seconds of pure re-parsing that grows with the fleet, not with
 * the work. The key is the file's IDENTITY — nanosecond mtime, size and inode
 * ({@link registryCacheKey}) — so an edit from ANOTHER process
 * (molecule's pre-commit doc regen writes this file) or an `MLCL_REGISTRY_PATH`
 * flip is honored on the next call; in-process writes go through
 * {@link writeRegistry}, which calls {@link clearRegistryCache}. The map holds
 * at most {@link RAW_REGISTRY_CACHE_LIMIT} paths — alternate registries in a
 * multi-registry workflow, never a growth surface.
 *
 * Callers must treat the returned object as READ-ONLY or finish in a registry
 * write: the sync-registry subcommands mutate it and then writeFileSync the
 * file (mtime changes → fresh parse next call). Every other caller only reads.
 */
/** Cached registry paths kept before the oldest is evicted (see the cap below). */
export const RAW_REGISTRY_CACHE_LIMIT = 4

const rawRegistryCache = new Map<string, { key: string; registry: Registry }>()

/**
 * The cache key that identifies one STATE of a registry file.
 *
 * Millisecond mtime + size is NOT an identity: two writers inside the same
 * millisecond whose documents happen to be the same length share it, and the
 * reader then serves the FIRST parse for the rest of the process's life. That
 * bound is reachable — a publish replaces the file by rename (so the inode
 * changes every time even when the bytes are the same length), and
 * `writeRegistry`'s own {@link RegistryStamp} already uses nanosecond mtime for
 * exactly this reason. Nanoseconds plus the inode catch both write shapes: a
 * rename (new inode, any mtime) and an in-place `writeFileSync` (same inode,
 * new mtime).
 *
 * @param stat - The file's `statSync(path, { bigint: true })` result.
 * @returns The identity string the raw-registry cache is keyed on.
 */
function registryCacheKey(stat: { mtimeNs: bigint; size: bigint; ino: bigint }): string {
  return `${stat.mtimeNs}:${stat.size}:${stat.ino}`
}

/**
 * The parsed registry and whether the FILE was there.
 *
 * THE single read + `JSON.parse` + zod validation of the registry file: every
 * reader in this module goes through here, so a process pays for the
 * fleet-sized file once per (path, {@link registryCacheKey}) no matter how many
 * accessors it touches. `present` separates "the file is missing" from "the
 * registry is empty": {@link getRawRegistry} answers an empty registry for a
 * missing file (its callers only ever read an optional section), while
 * {@link loadRegistry} must fail loudly — an empty package list is a valid
 * registry, so it cannot stand in for a broken install.
 *
 * @param path - Registry file path (already resolved from the env override).
 * @returns The parsed registry, and whether the file existed.
 */
function rawRegistryAt(path: string): { registry: Registry; present: boolean } {
  let stat: { mtimeNs: bigint; size: bigint; ino: bigint }
  try {
    stat = statSync(path, { bigint: true })
  } catch (_error) {
    // No registry file at this path — the empty registry, flagged as absent.
    return { registry: { version: 1, packages: {} }, present: false }
  }
  const key = registryCacheKey(stat)
  const hit = rawRegistryCache.get(path)
  if (hit && hit.key === key) return { registry: hit.registry, present: true }
  const registry = RegistrySchema.parse(JSON.parse(readFileSync(path, 'utf-8')))
  if (rawRegistryCache.size >= RAW_REGISTRY_CACHE_LIMIT && !rawRegistryCache.has(path)) {
    const oldest = rawRegistryCache.keys().next().value
    if (oldest !== undefined) rawRegistryCache.delete(oldest)
  }
  rawRegistryCache.set(path, { key, registry })
  return { registry, present: true }
}

/**
 * Get the raw registry data (for AI context building).
 */
export function getRawRegistry(): Registry {
  return rawRegistryAt(registryFilePath()).registry
}

/**
 * Get the path to the registry file (honors the `MLCL_REGISTRY_PATH` override).
 */
export function getRegistryPath(): string {
  return registryFilePath()
}

// ============================================================================
// Framework Configuration (from registry)
// ============================================================================

/**
 * Load API framework configurations from the registry.
 */
export function loadApiFrameworks(): Record<string, ApiFrameworkConfig> {
  const registry = getRawRegistry()
  return registry.apiFrameworks ?? {}
}

/**
 * Load app framework configurations from the registry.
 */
export function loadAppFrameworks(): Record<string, AppFrameworkConfig> {
  const registry = getRawRegistry()
  return registry.appFrameworks ?? {}
}

/**
 * Get the set of npm dependency names that identify app projects.
 * Derived from all appFrameworks dependency keys in the registry.
 */
export function getAppFrameworkDeps(): string[] {
  const frameworks = loadAppFrameworks()
  const deps = new Set<string>()
  for (const fw of Object.values(frameworks)) {
    for (const dep of Object.keys(fw.dependencies ?? {})) {
      deps.add(dep)
    }
  }
  return [...deps]
}

/**
 * Detect the app framework from a project's dependency map.
 * Returns the framework key (e.g. 'react', 'vue', 'svelte', 'solid') or undefined.
 */
export function detectAppFramework(
  deps: Record<string, string>,
  moleculeMeta?: { framework?: string },
): string | undefined {
  // Primary: explicit framework marker set by mlcl create
  if (moleculeMeta?.framework) return moleculeMeta.framework
  // Fallback: match framework deps/devDeps from registry
  const frameworks = loadAppFrameworks()
  for (const [name, fw] of Object.entries(frameworks)) {
    const fwDeps = [...Object.keys(fw.dependencies ?? {}), ...Object.keys(fw.devDependencies ?? {})]
    if (fwDeps.some((d) => d in deps)) return name
  }
  return undefined
}

/**
 * Get the shared code subdirectory for a framework (e.g. 'lib' for SvelteKit).
 * Returns undefined if the framework uses the default src/ root.
 */
export function getSharedCodeDir(framework: string): string | undefined {
  const frameworks = loadAppFrameworks()
  return frameworks[framework]?.sharedCodeDir
}

/**
 * Load pinned toolchain versions from the registry.
 * Returns shared, api, app, and moleculePackage dev dependency maps.
 */
export function loadToolchain(): {
  shared: Record<string, string>
  api: Record<string, string>
  app: Record<string, string>
  moleculePackage: Record<string, string>
} {
  const registry = getRawRegistry()
  return {
    shared: registry.toolchain?.shared ?? {},
    api: registry.toolchain?.api ?? {},
    app: registry.toolchain?.app ?? {},
    moleculePackage: registry.toolchain?.moleculePackage ?? {},
  }
}

/**
 * Load the exact @molecule/* version map from the registry.
 *
 * Returns the lockstep `default` version every @molecule package pins to plus
 * any per-package `overrides`. This is the single source of truth for the
 * versions scaffolded projects pin each @molecule dependency to.
 */
export function loadMoleculeVersions(): { default: string; overrides: Record<string, string> } {
  const registry = getRawRegistry()
  return {
    default: registry.moleculeVersions?.default ?? '1.0.0',
    overrides: registry.moleculeVersions?.overrides ?? {},
  }
}

/**
 * Resolve the exact version a given @molecule/* package pins to.
 *
 * Reads `moleculeVersions.overrides[packageName]` first, then falls back to
 * `moleculeVersions.default`. Never returns a range — exact pins only. Packages
 * not present in the map resolve to the default (the monorepo lockstep version).
 *
 * @param packageName - The @molecule/* package name to resolve a version for.
 */
export function getMoleculeVersion(packageName: string): string {
  const { default: defaultVersion, overrides } = loadMoleculeVersions()
  return overrides[packageName] ?? defaultVersion
}

/**
 * Load staging driver configurations from the registry.
 */
export function loadStagingDrivers(): Record<string, StagingDriverRegistryEntry> {
  const registry = getRawRegistry()
  return registry.stagingDrivers ?? {}
}

/**
 * Theme preset entry from the registry.
 */
export interface ThemePreset {
  label: string
  description: string
  themeProvider: string
  classMapProvider?: string
}

/**
 * Load theme preset configurations from the registry.
 */
export function loadThemePresets(): Record<string, ThemePreset> {
  const registry = getRawRegistry()
  return (registry.themePresets ?? {}) as Record<string, ThemePreset>
}
