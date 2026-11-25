/**
 * A package's registry `category` is the key its interface is bonded under, so it must name the capability.
 *
 * The category is what molecule.dev's package lookup tells a model to bond a provider under, what `mlcl create`
 * groups a feature's providers by, what search ranks an exact category query by, and what `mlcl init` infers a
 * provider's `implements` from. Until 2026-11-25 the 23 native device cores said `native` (their type), the
 * three middleware cores `core` and their Express providers `middleware`, and the notification center's
 * database store `notifications`, the key the Slack and webhook notification providers bond under.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { getRawRegistry } from '../registry.js'

/**
 * Package kinds (`type` values) that say what a package is, never which capability it serves. (`bond` is the
 * bond system's own capability, `@molecule/api-bond` and `@molecule/app-bond`; `framework` groups the six
 * framework packages `mlcl create` picks from.)
 */
const KIND_NAMES = new Set(['core', 'native', 'middleware', 'provider', 'utility'])

/**
 * Whether a provider's category fits the core it implements: the same key, or `<core category>-<interface>` for
 * a second interface the core bonds under its own key (`@molecule/api-project-archive` registers its
 * external-state providers under `project-archive-external-state`).
 *
 * @param provider - The provider's category.
 * @param core - The implemented core's category.
 * @returns Whether they agree.
 */
function categoryFits(provider: string, core: string): boolean {
  return provider === core || provider.startsWith(`${core}-`)
}

describe('registry categories', () => {
  const packages = Object.entries(getRawRegistry().packages)

  it('gives every provider its core’s category (OLD MUSTFAIL: 12 providers did not)', () => {
    const misfits = packages.flatMap(([name, entry]) => {
      if (entry.type !== 'provider' || !entry.implements) return []
      const cores = Array.isArray(entry.implements) ? entry.implements : [entry.implements]
      return cores
        .map((core) => [core, getRawRegistry().packages[core]?.category] as const)
        .filter(([, category]) => category !== undefined && !categoryFits(entry.category, category))
        .map(([core, category]) => `${name} (${entry.category}) implements ${core} (${category})`)
    })
    expect(misfits).toEqual([])
  })

  it('never names a package’s category after its kind (OLD MUSTFAIL: 30 packages did)', () => {
    const named = packages
      .filter(([, entry]) => KIND_NAMES.has(entry.category))
      .map(([name, entry]) => `${name}: ${entry.category}`)
    expect(named).toEqual([])
  })

  it('accepts a second interface’s key and refuses an unrelated one', () => {
    expect(categoryFits('project-archive-external-state', 'project-archive')).toBe(true)
    expect(categoryFits('notification-center', 'notification-center')).toBe(true)
    expect(categoryFits('notifications', 'notification-center')).toBe(false)
    expect(categoryFits('middleware', 'cors')).toBe(false)
  })
})
