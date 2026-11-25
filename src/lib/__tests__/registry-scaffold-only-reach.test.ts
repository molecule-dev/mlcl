/**
 * No package search or `mlcl add` offers may install a scaffold-only bundle through its required
 * peers. Refusing `@molecule/api-bonds-default-express` by name kept it out of a custom stack only
 * while nothing the user chose required it: eleven resources required it for four route helpers
 * (and six AI packages declared it without importing it), so adding a task resource installed the
 * 45 providers the bundle wires, Stripe and S3 among them.
 */
import { describe, expect, it } from 'vitest'

import { loadRegistry } from '../registry.js'
import { scaffoldOnlyReach } from '../scaffold-only.js'
import type { InferredPackage } from '../schema.js'

const BUNDLE = '@molecule/api-bonds-default-express'
const TASK = '@molecule/api-resource-task'
const RESOURCE = '@molecule/api-resource'

/** The real registry by name, with each named entry's `molecule` metadata changed. */
function registryWith(
  changes: Record<string, (molecule: NonNullable<InferredPackage['molecule']>) => void> = {},
): Map<string, InferredPackage> {
  const byName = new Map(loadRegistry().map((pkg) => [pkg.name, pkg]))
  for (const [name, change] of Object.entries(changes)) {
    const entry = structuredClone(byName.get(name))
    if (!entry?.molecule) throw new Error(`no registry entry ${name}`)
    change(entry.molecule)
    byName.set(name, entry)
  }
  return byName
}

describe('scaffoldOnlyReach', () => {
  it('finds no offered package that installs a scaffold-only bundle', () => {
    expect(scaffoldOnlyReach()).toEqual([])
  })

  it('reports a resource that requires the bundle directly', () => {
    const reach = scaffoldOnlyReach(registryWith({ [TASK]: (m) => m.moleculePeers?.push(BUNDLE) }))
    expect(reach).toContainEqual({ name: TASK, bundles: expect.arrayContaining([BUNDLE]) })
  })

  it('reports every package that reaches the bundle through a peer of a peer', () => {
    const reach = scaffoldOnlyReach(
      registryWith({ [RESOURCE]: (m) => m.moleculePeers?.push(BUNDLE) }),
    )
    const names = reach.map((entry) => entry.name)
    expect(names).toContain(RESOURCE)
    expect(names).toContain(TASK)
  })

  it('reports a core whose default provider is a bundle', () => {
    const core = '@molecule/api-database'
    const reach = scaffoldOnlyReach(
      registryWith({
        [core]: (m) => {
          m.defaultProvider = BUNDLE
        },
      }),
    )
    expect(reach.map((entry) => entry.name)).toContain(core)
  })

  it('does not report the bundles themselves or a package no one is offered', () => {
    const reach = scaffoldOnlyReach(
      registryWith({
        [TASK]: (m) => {
          m.moleculePeers?.push(BUNDLE)
          m.replacedBy = '@molecule/api-resource-user'
        },
      }),
    )
    expect(reach).toEqual([])
  })
})
