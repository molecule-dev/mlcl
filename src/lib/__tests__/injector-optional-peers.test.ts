/**
 * An injection installs a package's required peers and never its optional ones.
 *
 * Every framework binding (`@molecule/app-react`, `-vue`, `-solid`, `-svelte`, `-angular`) peers on
 * the IDE, code-editor and live-preview cores, marked `optional` in `peerDependenciesMeta`: only
 * the hooks that read those providers need them, and they import types alone. Before 2026-11-13
 * the planner wrote every peer into the project's dependencies, so each fresh app gained the three
 * packages; their locale bonds were then planned without being installed, and `mlcl inject` exited
 * 1 ("Could not resolve @molecule/app-locales-ide") on every new Vue, Solid, Svelte and Angular app.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { planInjection } from '../injector.js'
import { optionalPeersOf } from '../scanner.js'

const PKG = '@molecule/app-optional-peer-fixture'
const REQUIRED = '@molecule/app-i18n'
const OPTIONAL = '@molecule/app-ide'
const THIRD_PARTY_OPTIONAL = 'probe-optional-lib'

describe('optionalPeersOf', () => {
  it('names only the peers marked optional: true', () => {
    expect(
      optionalPeersOf({
        [OPTIONAL]: { optional: true },
        [REQUIRED]: { optional: false },
        other: {},
        odd: 'optional',
      }),
    ).toEqual([OPTIONAL])
  })

  it('reads a missing or malformed field as no optional peers', () => {
    expect(optionalPeersOf(undefined)).toEqual([])
    expect(optionalPeersOf(null)).toEqual([])
    expect(optionalPeersOf('optional')).toEqual([])
  })
})

describe('planInjection and optional peers', () => {
  let base: string
  let project: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'mlcl-injector-optional-peers-'))
    project = join(base, 'proj')
    mkdirSync(join(project, 'src'), { recursive: true })
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'demo-app', version: '1.0.0', dependencies: {} }),
    )
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  /**
   * Install the fixture package with one required and two optional peers.
   *
   * @param meta - Its `peerDependenciesMeta`, or undefined for none.
   */
  function install(meta: Record<string, unknown> | undefined): void {
    const root = join(base, 'node_modules', PKG)
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: PKG,
        version: '1.0.0',
        peerDependencies: {
          [REQUIRED]: '^1.0.0',
          [OPTIONAL]: '^1.0.1',
          [THIRD_PARTY_OPTIONAL]: '^2.0.0',
        },
        ...(meta ? { peerDependenciesMeta: meta } : {}),
      }),
    )
    writeFileSync(join(root, 'src', 'index.ts'), 'export const fixture = 1\n')
  }

  /**
   * The peer names a plan for the fixture would install.
   *
   * @returns Those names, in plan order.
   */
  async function plannedPeers(): Promise<string[]> {
    const plan = await planInjection(PKG, project)
    expect(plan.moleculePackage?.name).toBe(PKG)
    return plan.dependencies
      .filter((dependency) => dependency.type === 'peerDependency')
      .map((dependency) => dependency.name)
  }

  it('installs the required peer and skips the optional ones, @molecule or not', async () => {
    install({ [OPTIONAL]: { optional: true }, [THIRD_PARTY_OPTIONAL]: { optional: true } })
    expect(await plannedPeers()).toEqual([REQUIRED])
  })

  it('installs every peer a manifest leaves required (control)', async () => {
    install(undefined)
    expect(await plannedPeers()).toEqual([REQUIRED, OPTIONAL, THIRD_PARTY_OPTIONAL])
  })
})
