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

import { frameworksAcceptedBy, packageFramework } from './package-search.js'
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

/**
 * The test a framework's catalog applies to each package: framework-neutral, or
 * written for a framework a project of this one can import (`packageFramework`,
 * `frameworksAcceptedBy`). The package's dependencies decide, not its name:
 * `app-i18n-default-react` peers no React and serves every framework.
 *
 * @param registry - The registry, for its `appFrameworks`.
 * @param framework - The project's framework key.
 * @returns Whether an entry belongs in that framework's catalog.
 */
export function frameworkCatalogFilter(
  registry: Registry,
  framework: string,
): (entry: RegistryEntry) => boolean {
  const appFrameworks = registry.appFrameworks ?? {}
  const accepted = new Set(frameworksAcceptedBy(framework, appFrameworks))
  return (entry) => {
    const written = packageFramework(entry, appFrameworks)
    return !written || accepted.has(written)
  }
}

function formatPackageLine(p: PackageLine): string {
  const desc = p.description ? ` — ${p.description}` : ''
  return `- \`${p.name}\` — ${p.label}${desc}`
}

export function buildCatalog({ registry, framework, stack }: BuildCatalogOptions): string {
  const byIntent = new Map<string, PackageLine[]>()
  const unhinted: PackageLine[] = []
  const inFramework = frameworkCatalogFilter(registry, framework)

  for (const [name, entry] of Object.entries(registry.packages)) {
    if (!includesStack(stack, entry.stack)) continue
    if (!inFramework(entry)) continue
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
