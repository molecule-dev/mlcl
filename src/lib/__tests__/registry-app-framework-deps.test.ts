/**
 * `getAppFrameworkDeps()` is the registry-derived list of npm dependency names
 * that identify an APP project — the "is this an app?" heuristic both callers
 * run (`inject.ts`'s `detectAppProject`, `validator.ts`'s
 * `detectAppProjectForValidation`): each merges the project's `dependencies`
 * AND `devDependencies` into one map and asks whether any name from that list
 * is in it.
 *
 * A framework whose identifying packages live ONLY in its `devDependencies`
 * therefore contributed NOTHING to the list, and the heuristic could never
 * recognise it: `appFrameworks.svelte` ships `dependencies: {}` with `svelte`,
 * `@sveltejs/kit`, `@sveltejs/adapter-auto` and `@sveltejs/vite-plugin-svelte`
 * all under `devDependencies` (the registry's own entry), so a Svelte project
 * was invisible to it. The consequence is not cosmetic — the flag it decides
 * routes secrets into `app/.env` vs `api/.env`, runs the API-only
 * `ensureMigrateRunnerImports` step, and picks the validation mode — so a
 * SvelteKit project integrated through `mlcl inject -m <package>` (the
 * documented existing-app flow) fell into the API branch whenever the registry
 * heuristic was the decisive one.
 *
 * The assertion is DERIVED from the registry, not a hand-typed name: every
 * framework the registry declares must contribute at least one of the names it
 * declares (across both dependency keys, which is exactly the set the callers
 * can observe in a manifest), so a future framework whose marker is dev-only —
 * or one whose `dependencies` empties out — fails here instead of going
 * silently undetectable.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { getAppFrameworkDeps, loadAppFrameworks } from '../registry.js'

describe('getAppFrameworkDeps — every declared app framework is identifiable', () => {
  it('names at least one dependency for every framework the registry declares', () => {
    const frameworks = loadAppFrameworks()
    // Non-vacuity: the registry does declare frameworks to check.
    expect(Object.keys(frameworks).length).toBeGreaterThan(1)

    const identifying = getAppFrameworkDeps()
    const silent: string[] = []
    for (const [name, fw] of Object.entries(frameworks)) {
      const declared = [
        ...Object.keys(fw.dependencies ?? {}),
        ...Object.keys(fw.devDependencies ?? {}),
      ]
      if (declared.length === 0) continue
      if (!declared.some((dep) => identifying.includes(dep))) silent.push(name)
    }

    expect(
      silent,
      'a framework contributes no name to getAppFrameworkDeps, so the callers' +
        ' "is this an app project?" check can never recognise a project built on it',
    ).toEqual([])
  })

  it('recognises a Svelte project, whose identifying packages are all devDependencies', () => {
    const identifying = getAppFrameworkDeps()
    // The registry's svelte entry: `dependencies: {}`, the Kit/adapter/plugin
    // under `devDependencies`. A Svelte manifest carries `svelte` there.
    expect(identifying, 'the svelte marker must be in the list').toContain('svelte')
  })

  it('still names a framework whose markers are runtime dependencies (the positive twin)', () => {
    // react declares react/react-dom/react-router in `dependencies`; the fix
    // must not turn that into a devDependencies-only list.
    expect(getAppFrameworkDeps()).toContain('react')
  })
})
