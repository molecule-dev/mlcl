/**
 * Rules for registry `intentHints` shared by more than one package.
 *
 * @module
 */

import { type AppFrameworkInstalls, packageFramework } from './package-search.js'
import { INTENT_HINT_PATTERN, type Registry } from './schema.js'

/** The registry fields this rule reads. */
export interface HintOwnerEntry {
  /** The package's category. */
  category?: string
  /** Whether several providers of the category may be installed together. */
  multiSelect?: boolean
  /** The framework the package is for, when the registry records it. */
  framework?: string
  /** The package's stack (`app` or `api`). */
  stack?: string
  /** The package's dependencies and peers, as sync-registry records them. */
  runtimeDependencies?: string[]
}

/**
 * Whether one hint may name every one of these packages. Two cases may share a hint:
 * providers of one multi-select category, and the framework counterparts of one feature
 * (`@molecule/app-footer-react` and `@molecule/app-footer-vue`), because the intent matcher
 * only offers a project the packages of its own framework, so they never compete.
 *
 * A package's framework is the one its dependencies name ({@link packageFramework}, the rule
 * search, the catalog and `mlcl create` use), not its name: `@molecule/app-embeddable-chat-widget`
 * peers React and carries no `-react` suffix, and its Vue, Svelte, Solid and Angular ports are
 * its counterparts. A counterpart's name is the shared stem plus its framework suffix, or the
 * stem itself. A framework-neutral package (`@molecule/app-footer`, which every project is
 * offered) never shares a hint with a framework's package.
 *
 * @param owners - The names of the packages that carry the hint (two or more).
 * @param packages - The registry's `packages` map.
 * @param appFrameworks - The registry's `appFrameworks`, whose dependencies identify each framework.
 * @returns True when the shared hint is allowed.
 */
export function sharedHintAllowed(
  owners: readonly string[],
  packages: Readonly<Record<string, HintOwnerEntry>>,
  appFrameworks: Record<string, AppFrameworkInstalls>,
): boolean {
  const categories = new Set(owners.map((name) => packages[name]?.category))
  if (categories.size === 1 && owners.every((name) => packages[name]?.multiSelect === true))
    return true
  const frameworks = new Set<string>()
  const stems = new Set<string>()
  for (const name of owners) {
    const framework = packageFramework(packages[name] ?? {}, appFrameworks)
    if (!framework) return false
    frameworks.add(framework)
    stems.add(name.endsWith(`-${framework}`) ? name.slice(0, -(framework.length + 1)) : name)
  }
  return frameworks.size === owners.length && stems.size === 1
}

/** One finding of {@link intentHintReport}. */
export interface IntentHintViolation {
  /** The package the finding is about, or the hint itself for a duplicate. */
  subject: string
  /** What is wrong and how to fix it. */
  message: string
}

/** What {@link intentHintReport} found in one registry. */
export interface IntentHintReport {
  /** Every blocking finding; empty when the registry passes. */
  violations: IntentHintViolation[]
  /** Packages that carry at least one hint. */
  hintedCount: number
  /** Hints across every package. */
  totalHints: number
  /** Packages the intent matcher cannot see: no hints, not hidden, not an exempt type. */
  uncovered: string[]
}

/** Types never surfaced by intent: framework bindings, wiring infrastructure and locale bonds. */
const EXEMPT_TYPES = new Set(['framework', 'infrastructure', 'locales'])

/**
 * Check a registry's `intentHints`, the rules `sync-registry --check-intent-hints` (CI) and mlcl's
 * pre-commit (`scripts/check-registry-intent-hints.mjs`, on the staged registry) both apply.
 *
 * Every package except framework bindings, infrastructure and locale bonds needs at least one hint,
 * or `ui.hidden` when no app picks it directly (a package only other packages use). A package
 * with no hints is invisible to molecule-dev's intent matcher, so the executor is never told it
 * exists. Each package carries at most 8 hints in the schema's pattern, and a hint names one
 * package unless {@link sharedHintAllowed} allows the owners to share it. A declaration awaiting
 * its first release (`pendingPackages`) is held to the same rules: the release moves it into
 * `packages` once npm serves it.
 *
 * @param registry - The registry to check.
 * @returns The findings and counts.
 */
export function intentHintReport(
  registry: Pick<Registry, 'packages' | 'pendingPackages' | 'appFrameworks'>,
): IntentHintReport {
  // A name is in one section or the other, never both (the registry schema refuses that).
  const packages = { ...registry.packages, ...registry.pendingPackages }
  const violations: IntentHintViolation[] = []
  const hintOwners = new Map<string, string[]>()
  const uncovered: string[] = []
  let hintedCount = 0
  let totalHints = 0
  for (const [name, entry] of Object.entries(packages)) {
    const hints = entry.intentHints ?? []
    if (hints.length === 0) {
      if (entry.ui?.hidden !== true && !EXEMPT_TYPES.has(entry.type)) {
        uncovered.push(name)
        violations.push({
          subject: name,
          message: `no intentHints — matcher-invisible (type ${entry.type}); author hints or mark ui.hidden`,
        })
      }
      continue
    }
    hintedCount++
    totalHints += hints.length
    if (hints.length > 8)
      violations.push({ subject: name, message: `${hints.length} hints (cap is 8)` })
    for (const hint of hints) {
      if (!INTENT_HINT_PATTERN.test(hint))
        violations.push({
          subject: name,
          message: `invalid hint ${JSON.stringify(hint)} (lowercase letters/digits/spaces/-//only)`,
        })
      const owners = hintOwners.get(hint) ?? []
      owners.push(name)
      hintOwners.set(hint, owners)
    }
  }
  for (const [hint, owners] of hintOwners) {
    if (owners.length < 2 || sharedHintAllowed(owners, packages, registry.appFrameworks ?? {}))
      continue
    violations.push({
      subject: `duplicate hint ${JSON.stringify(hint)}`,
      message: `carried by ${owners.join(', ')}`,
    })
  }
  return { violations, hintedCount, totalHints, uncovered }
}
