import type { InferredPackage } from './schema.js'

/** Registry fields that determine whether an interface gets an automatic provider. */
interface ProviderEntry {
  type?: string
  implements?: string
  defaultProvider?: string
  framework?: string
}

/** Read the declared scope, even when the package view inferred a framework for discovery. */
export function defaultProviderEntries(
  packages: Iterable<InferredPackage>,
): Map<string, ProviderEntry> {
  const entries = new Map<string, ProviderEntry>()
  for (const { name, molecule, frameworkInferred } of packages) {
    if (!molecule) continue
    entries.set(name, frameworkInferred ? { ...molecule, framework: undefined } : molecule)
  }
  return entries
}

/**
 * Choose the automatic provider for an interface. An explicitly scoped default requires the
 * exact project renderer. An unscoped default keeps the preference for a renderer-specific
 * implementation, when the registry offers one. An existing implementation always wins.
 *
 * @param core - The interface package's name.
 * @param entries - The registry metadata by package name.
 * @param present - Packages the project or request already includes.
 * @param framework - The project's renderer, if known.
 * @returns The provider to add, if any.
 */
export function defaultProviderFor(
  core: string,
  entries: ReadonlyMap<string, ProviderEntry>,
  present: Iterable<string>,
  framework: string | undefined,
): string | undefined {
  const name = entries.get(core)?.defaultProvider
  if (!name) return undefined
  const fallback = entries.get(name)
  if (!fallback || (fallback.framework && fallback.framework !== framework)) return undefined

  for (const selected of present) {
    const entry = entries.get(selected)
    // Framework bindings can implement the interface without supplying its bond.
    if (selected === name || (entry?.implements === core && entry.type !== 'framework')) return
  }

  if (!fallback.framework && framework) {
    for (const [candidate, entry] of entries) {
      if (entry.type === 'provider' && entry.implements === core && entry.framework === framework)
        return candidate
    }
  }
  return name
}
