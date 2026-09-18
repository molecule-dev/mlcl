/**
 * Catalog generator — turns the registry into an intent-grouped, framework-scoped
 * markdown catalog for the `.agents/skills/molecule-packages/SKILL.md` skill.
 *
 * Output shape:
 *
 *     # @molecule/* packages — <framework>/<stack>
 *     ## Intent: <hint>
 *     - <package> — <label>. Replaces: <category>.
 *     ## Packages without declared intent (reference)
 *     - <package> — <label>.
 *
 * Deterministic: intents sorted alphabetically, packages within an intent sorted
 * alphabetically, so snapshot diffs are stable.
 *
 * @module
 */

import type { Registry, RegistryEntry } from './schema.js'

export type CatalogStack = 'api' | 'app' | 'full-stack'

export interface BuildCatalogOptions {
  registry: Registry
  framework: string
  stack: CatalogStack
}

interface PackageLine {
  name: string
  label: string
  category: string
  description?: string
}

const sortByName = (a: PackageLine, b: PackageLine): number => a.name.localeCompare(b.name)

function includesStack(stack: CatalogStack, entryStack: 'api' | 'app'): boolean {
  if (stack === 'full-stack') return true
  return stack === entryStack
}

const FRAMEWORK_SUFFIXES = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native'] as const

export function inferFrameworkFromName(name: string): string | null {
  for (const suffix of FRAMEWORK_SUFFIXES) {
    if (name.endsWith(`-${suffix}`)) return suffix
  }
  return null
}

function matchesFramework(name: string, entry: RegistryEntry, framework: string): boolean {
  if (entry.framework) return entry.framework === framework
  const inferred = inferFrameworkFromName(name)
  if (inferred) return inferred === framework
  // No framework signal at all — framework-agnostic package, include everywhere.
  return true
}

function formatPackageLine(p: PackageLine): string {
  const desc = p.description ? ` — ${p.description}` : ''
  return `- \`${p.name}\` — ${p.label}${desc}`
}

export function buildCatalog({ registry, framework, stack }: BuildCatalogOptions): string {
  const byIntent = new Map<string, PackageLine[]>()
  const unhinted: PackageLine[] = []

  for (const [name, entry] of Object.entries(registry.packages)) {
    if (!includesStack(stack, entry.stack)) continue
    if (!matchesFramework(name, entry, framework)) continue
    if (entry.ui?.hidden) continue

    const line: PackageLine = {
      name,
      label: entry.label,
      category: entry.category,
      description: entry.description,
    }

    const hints = entry.intentHints ?? []
    if (hints.length === 0) {
      // Only include "interesting" packages in the fallback reference list:
      // feature-level packages the AI might reach for. Core interfaces,
      // middleware, utilities, locales, infrastructure are noise here.
      if (entry.type === 'feature' || entry.type === 'resource' || entry.type === 'framework') {
        unhinted.push(line)
      }
      continue
    }

    for (const hint of hints) {
      const list = byIntent.get(hint) ?? []
      list.push(line)
      byIntent.set(hint, list)
    }
  }

  const lines: string[] = []
  lines.push(`# @molecule/* packages — ${framework}/${stack}`, '')
  lines.push(
    'Grouped by user intent. Reach for these instead of hand-rolling primitives.',
    "Full API lives in each package's README.md.",
    '',
  )

  const sortedIntents = [...byIntent.keys()].sort((a, b) => a.localeCompare(b))
  for (const intent of sortedIntents) {
    lines.push(`## Intent: ${intent}`, '')
    const pkgs = byIntent.get(intent)!.sort(sortByName)
    for (const p of pkgs) lines.push(formatPackageLine(p))
    lines.push('')
  }

  if (unhinted.length > 0) {
    lines.push('## Packages without declared intent (reference)', '')
    for (const p of unhinted.sort(sortByName)) lines.push(formatPackageLine(p))
    lines.push('')
  }

  return lines.join('\n')
}
