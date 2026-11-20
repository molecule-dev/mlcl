/**
 * Rules for registry `intentHints` shared by more than one package.
 *
 * @module
 */

import { type AppFrameworkInstalls, packageFramework } from './package-search.js'

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
