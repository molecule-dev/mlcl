/**
 * Rules for registry `intentHints` shared by more than one package.
 *
 * @module
 */

/** The framework suffixes a framework-specific package name ends with (`-react-native` before `-react`). */
const FRAMEWORK_SUFFIXES = ['react-native', 'react', 'vue', 'svelte', 'solid', 'angular'] as const

/** The registry fields this rule reads. */
export interface HintOwnerEntry {
  /** The package's category. */
  category?: string
  /** Whether several providers of the category may be installed together. */
  multiSelect?: boolean
  /** The framework the package is for, when the registry records it. */
  framework?: string
}

/**
 * The framework a package is for: its registry `framework`, else the framework suffix of its
 * name (`@molecule/app-footer-vue` → `vue`), the same inference molecule-dev's intent matcher
 * uses to keep a project's candidates to its own framework.
 *
 * @param name - The package name.
 * @param entry - The package's registry entry.
 * @returns The framework, or `null` for a framework-neutral package.
 */
export function packageFramework(name: string, entry: HintOwnerEntry): string | null {
  if (entry.framework) return entry.framework
  return FRAMEWORK_SUFFIXES.find((suffix) => name.endsWith(`-${suffix}`)) ?? null
}

/**
 * Whether one hint may name every one of these packages. Two cases may share a hint:
 * providers of one multi-select category, and the framework counterparts of one feature
 * (`@molecule/app-footer-react` and `@molecule/app-footer-vue`), because the intent matcher
 * only offers a project the packages of its own framework, so they never compete.
 *
 * @param owners - The names of the packages that carry the hint (two or more).
 * @param packages - The registry's `packages` map.
 * @returns True when the shared hint is allowed.
 */
export function sharedHintAllowed(
  owners: readonly string[],
  packages: Readonly<Record<string, HintOwnerEntry>>,
): boolean {
  const categories = new Set(owners.map((name) => packages[name]?.category))
  if (categories.size === 1 && owners.every((name) => packages[name]?.multiSelect === true))
    return true
  const frameworks = new Set<string>()
  const stems = new Set<string>()
  for (const name of owners) {
    const framework = packageFramework(name, packages[name] ?? {})
    if (!framework || !name.endsWith(`-${framework}`)) return false
    frameworks.add(framework)
    stems.add(name.slice(0, -(framework.length + 1)))
  }
  return frameworks.size === owners.length && stems.size === 1
}
