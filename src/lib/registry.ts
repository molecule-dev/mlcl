/**
 * Registry loader — reads the centralized molecule registry.
 *
 * Reads mlcl/registry.json, the single source of truth for all package metadata.
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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

let _cache: InferredPackage[] | null = null

function resolveMoleculeDir(): string {
  if (process.env.MOLECULE_PACKAGES_DIR) {
    // MOLECULE_PACKAGES_DIR points to molecule/packages, go up one level
    return join(process.env.MOLECULE_PACKAGES_DIR, '..')
  }
  return join(__dirname, '..', '..', '..', 'molecule')
}

function loadFromRegistry(): InferredPackage[] {
  const raw = readFileSync(registryFilePath(), 'utf-8')
  const registry = RegistrySchema.parse(JSON.parse(raw))
  const moleculeDir = resolveMoleculeDir()

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
 * @param projectType - 'api' or 'app' (optional — returns all if omitted)
 */
export function loadRegistry(projectType?: 'api' | 'app'): InferredPackage[] {
  if (!_cache) {
    _cache = loadFromRegistry()
  }

  if (!projectType) return _cache
  return _cache.filter((entry) => {
    const stack = entry.molecule?.stack
    return stack === projectType
  })
}

/**
 * Clear the cached registry (useful in tests).
 */
export function clearRegistryCache(): void {
  _cache = null
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

function readRegistry(): Registry {
  if (existsSync(registryFilePath())) {
    return RegistrySchema.parse(JSON.parse(readFileSync(registryFilePath(), 'utf-8')))
  }
  return { version: 1, packages: {} }
}

function writeRegistry(registry: Registry): void {
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
  writeFileSync(registryFilePath(), JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
  clearRegistryCache()
}

/**
 * Add or update a package entry in the registry.
 */
export function updateRegistryEntry(packageName: string, entry: RegistryEntry): void {
  const registry = readRegistry()
  registry.packages[packageName] = entry
  writeRegistry(registry)
}

/**
 * Remove a package entry from the registry.
 */
export function removeRegistryEntry(packageName: string): void {
  const registry = readRegistry()
  delete registry.packages[packageName]
  writeRegistry(registry)
}

/**
 * Get the raw registry data (for AI context building).
 */
export function getRawRegistry(): Registry {
  if (existsSync(registryFilePath())) {
    return RegistrySchema.parse(JSON.parse(readFileSync(registryFilePath(), 'utf-8')))
  }
  return { version: 1, packages: {} }
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
