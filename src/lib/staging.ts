/**
 * Staging infrastructure utilities for CLI commands.
 *
 * Centralizes all staging-related imports and operations so individual
 * commands don't hardcode package names. Driver packages are resolved
 * dynamically from the registry.
 *
 * @module
 */

import type { StagingDriver } from '@molecule/api-staging'
import type { StagingEnvironmentRecord } from '@molecule/api-staging-state'

import { loadStagingDrivers } from './registry.js'
import type { StagingDriverRegistryEntry } from './schema.js'

// ============================================================================
// Lazy-loaded infrastructure modules
// ============================================================================

/* eslint-disable @typescript-eslint/consistent-type-imports -- module namespace caching requires typeof import() */
let _stagingModule: typeof import('@molecule/api-staging') | null = null
let _stateModule: typeof import('@molecule/api-staging-state') | null = null

async function loadStagingCore(): Promise<typeof import('@molecule/api-staging')> {
  if (!_stagingModule) {
    _stagingModule = await import('@molecule/api-staging')
  }
  return _stagingModule
}

async function loadStagingState(): Promise<typeof import('@molecule/api-staging-state')> {
  if (!_stateModule) {
    _stateModule = await import('@molecule/api-staging-state')
  }
  return _stateModule
}
/* eslint-enable @typescript-eslint/consistent-type-imports */

// ============================================================================
// Branch / Slug
// ============================================================================

/**
 * Converts a git branch name to a DNS-safe slug.
 *
 * @param branch - Git branch name.
 * @returns Slug string.
 */
export async function branchToSlug(branch: string): Promise<string> {
  const { branchToSlug: slugify } = await loadStagingCore()
  return slugify(branch)
}

// ============================================================================
// State operations
// ============================================================================

/**
 * Retrieves a staging environment record by slug.
 *
 * @param projectPath - Absolute path to the project root.
 * @param slug - Environment slug.
 * @returns The environment record, or `undefined`.
 */
export async function getEnvironment(
  projectPath: string,
  slug: string,
): Promise<StagingEnvironmentRecord | undefined> {
  const state = await loadStagingState()
  return state.getEnvironment(projectPath, slug)
}

/**
 * Lists all active staging environment records.
 *
 * @param projectPath - Absolute path to the project root.
 * @returns Array of environment records.
 */
export async function listEnvironments(projectPath: string): Promise<StagingEnvironmentRecord[]> {
  const state = await loadStagingState()
  return state.listEnvironments(projectPath)
}

/**
 * Adds or updates a staging environment record.
 *
 * @param projectPath - Absolute path to the project root.
 * @param record - The environment record.
 */
export async function addEnvironment(
  projectPath: string,
  record: StagingEnvironmentRecord,
): Promise<void> {
  const state = await loadStagingState()
  return state.addEnvironment(projectPath, record)
}

/**
 * Removes a staging environment record.
 *
 * @param projectPath - Absolute path to the project root.
 * @param slug - The slug of the environment to remove.
 */
export async function removeEnvironment(projectPath: string, slug: string): Promise<void> {
  const state = await loadStagingState()
  return state.removeEnvironment(projectPath, slug)
}

/**
 * Allocates non-colliding ports for a new staging environment.
 *
 * @param projectPath - Absolute path to the project root.
 * @param portRange - Port range from registry driver config.
 * @returns Allocated ports.
 * @throws {Error} If no free ports are available in the range.
 */
export async function allocatePort(
  projectPath: string,
  portRange: { start: number; end: number },
): Promise<{ api: number; app: number; db: number }> {
  const state = await loadStagingState()
  return state.allocatePort(projectPath, portRange)
}

// ============================================================================
// Driver operations
// ============================================================================

/**
 * Resolves a staging driver by name from the registry.
 * Returns the registry config and the dynamically loaded provider.
 *
 * @param driverName - Driver name (e.g. `'docker-compose'`). If omitted, uses the first registered driver.
 * @returns The driver config from registry and its loaded provider.
 * @throws {Error} If no staging drivers are registered or the named driver is not found.
 */
export async function loadDriver(driverName?: string): Promise<{
  name: string
  config: StagingDriverRegistryEntry
  provider: StagingDriver
}> {
  const drivers = loadStagingDrivers()
  const names = Object.keys(drivers)

  if (names.length === 0) {
    throw new Error('No staging drivers registered in registry.json.')
  }

  const resolvedName = driverName ?? names[0]
  const config = drivers[resolvedName]

  if (!config) {
    throw new Error(`Unknown staging driver: "${resolvedName}". Available: ${names.join(', ')}`)
  }

  const mod = await import(config.package)
  return { name: resolvedName, config, provider: mod.provider }
}
