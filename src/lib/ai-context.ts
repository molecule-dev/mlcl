/**
 * AI context builders for the tiered AI system.
 *
 * Phase 1 (Planning): buildRegistryContext() — lightweight full catalog for package selection.
 * Phase 2 (Assembly): buildPackageContext() — detailed README.md for selected packages.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { InferredPackage, Registry, RegistryEntry } from './schema.js'

/**
 * Phase 1: Build a compact text representation of the full registry.
 * Suitable for AI to read in its entirety for package selection decisions.
 *
 * ~200 bytes per package — scales to thousands of packages.
 */
export function buildRegistryContext(registry: Registry): string {
  return Object.entries(registry.packages)
    .map(([name, entry]) => {
      const parts = [`${name} [${entry.type}] — ${entry.label}`]
      if (entry.description) parts[0] += `: ${entry.description}`
      parts.push(`  category: ${entry.category}`)
      if (entry.stack) parts.push(`  stack: ${entry.stack}`)
      if (entry.implements) parts.push(`  implements: ${entry.implements}`)
      if (entry.defaultProvider) parts.push(`  defaultProvider: ${entry.defaultProvider}`)
      if (entry.multiSelect) parts.push(`  multiSelect: true`)
      if (entry.exports.length) parts.push(`  exports: [${entry.exports.join(', ')}]`)
      if (entry.secrets.length)
        parts.push(`  secrets: [${entry.secrets.map((s) => s.name).join(', ')}]`)
      if (entry.language !== 'typescript') parts.push(`  language: ${entry.language}`)
      if (entry.runtime !== 'node') parts.push(`  runtime: ${entry.runtime}`)
      return parts.join('\n')
    })
    .join('\n\n')
}

/**
 * Phase 2: Build detailed context from README.md files for selected packages.
 * Only called for the ~10-20 packages that will actually be used in the project.
 */
export function buildPackageContext(packages: InferredPackage[]): string {
  return packages
    .map((pkg) => {
      const sections = [`# ${pkg.name}`]
      if (pkg.moleculeMd) sections.push(pkg.moleculeMd)
      if (pkg.exports?.length) sections.push(`## Exports\n${pkg.exports.join(', ')}`)
      if (pkg.molecule) {
        const meta = pkg.molecule as RegistryEntry
        if (meta.implements) sections.push(`## Implements\n${meta.implements}`)
        if (meta.secrets?.length)
          sections.push(`## Secrets\n${meta.secrets.map((s) => s.name).join(', ')}`)
      }
      return sections.join('\n\n')
    })
    .join('\n\n---\n\n')
}

/**
 * Load README.md on-demand for a specific package.
 * Returns undefined if no README.md exists.
 */
export async function loadMoleculeMd(pkg: InferredPackage): Promise<string | undefined> {
  const mdPath = join(pkg.path, 'README.md')
  try {
    return await readFile(mdPath, 'utf-8')
  } catch (_error) {
    // Safe to ignore: README.md is optional; callers handle undefined gracefully
    return undefined
  }
}

/**
 * Load README.md files for multiple packages in parallel.
 * Mutates the packages in place, setting the moleculeMd field.
 */
export async function loadMoleculeMdBatch(packages: InferredPackage[]): Promise<void> {
  await Promise.all(
    packages.map(async (pkg) => {
      if (!pkg.moleculeMd) {
        pkg.moleculeMd = await loadMoleculeMd(pkg)
      }
    }),
  )
}
