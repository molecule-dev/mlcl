/**
 * Toolchain drift detection — verifies registry.json toolchain versions
 * match reference package.json files.
 *
 * When this test fails, run: mlcl sync-registry --sync-toolchain
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dir = dirname(fileURLToPath(import.meta.url))
const mlclRoot = join(__dir, '..', '..', '..')

function readJSON(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

const registry = readJSON(join(mlclRoot, 'registry.json')) as {
  toolchain?: {
    shared?: Record<string, string>
    api?: Record<string, string>
    app?: Record<string, string>
    moleculePackage?: Record<string, string>
  }
  appFrameworks?: Record<
    string,
    { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  >
  apiFrameworks?: Record<
    string,
    { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  >
  packages?: Record<string, { buildTooling?: { devDependencies?: Record<string, string> } }>
}

const mlclPkg = readJSON(join(mlclRoot, 'package.json')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const mlclAllDeps: Record<string, string> = {
  ...mlclPkg.dependencies,
  ...mlclPkg.devDependencies,
}

// Collect appFramework devDeps as additional app references
const appFrameworkDevDeps: Record<string, string> = {}
for (const fw of Object.values(registry.appFrameworks ?? {})) {
  Object.assign(appFrameworkDevDeps, fw.devDependencies ?? {})
}

describe('toolchain version sync', () => {
  it('shared toolchain versions match mlcl package.json', () => {
    const shared = registry.toolchain?.shared ?? {}
    const mismatches: string[] = []

    for (const [pkg, version] of Object.entries(shared)) {
      const ref = mlclAllDeps[pkg]
      if (ref && ref !== version) {
        mismatches.push(`${pkg}: toolchain=${version}, mlcl=${ref}`)
      }
    }

    expect(mismatches, 'Run: mlcl sync-registry --sync-toolchain').toEqual([])
  })

  it('api toolchain versions match mlcl package.json', () => {
    const api = registry.toolchain?.api ?? {}
    const mismatches: string[] = []

    for (const [pkg, version] of Object.entries(api)) {
      const ref = mlclAllDeps[pkg]
      if (ref && ref !== version) {
        mismatches.push(`${pkg}: toolchain=${version}, mlcl=${ref}`)
      }
    }

    expect(mismatches, 'Run: mlcl sync-registry --sync-toolchain').toEqual([])
  })

  it('app toolchain versions match mlcl package.json and framework configs', () => {
    const app = registry.toolchain?.app ?? {}
    const appRef = { ...mlclAllDeps, ...appFrameworkDevDeps }
    const mismatches: string[] = []

    for (const [pkg, version] of Object.entries(app)) {
      const ref = appRef[pkg]
      if (ref && ref !== version) {
        mismatches.push(`${pkg}: toolchain=${version}, reference=${ref}`)
      }
    }

    expect(mismatches, 'Run: mlcl sync-registry --sync-toolchain').toEqual([])
  })

  // ---------------------------------------------------------------------
  // Version-split gates.
  //
  // Regression guards for the 2026-08-01 blank-preview bug on CUSTOM apps:
  // the fleet-wide dep bump (molecule wave 1/2, 2026-07-30) swept every
  // template AND molecule's packages to tailwindcss 4.3.3 but registry
  // buildTooling (which is what `mlcl create` writes into a custom app's
  // package.json) stayed at 4.3.0. In the sandbox npm workspace that version
  // split meant the root node_modules slot belonged to 4.3.3 (never on disk —
  // dev-omitted at image build) while the app nested 4.3.0, so the
  // root-hoisted @tailwindcss/typography could not resolve
  // `tailwindcss/plugin`, every index.css compile failed, and the preview
  // rendered blank. Sandboxes install everything into ONE npm workspace
  // (molecule packages + the user app), so ANY version split between what a
  // scaffold pins and what molecule pins can break root hoisting the same
  // way. These gates keep all three pin sources — registry (custom apps),
  // the template fleet (flagship apps), molecule packages — agreeing on a
  // single version wherever they share a dependency.
  // ---------------------------------------------------------------------

  /** Collect dep → pinned versions across every template's app+api package.json. */
  function collectFleetPins(): Map<string, Set<string>> {
    const templatesDir = join(mlclRoot, 'templates', 'apps')
    const fleet = new Map<string, Set<string>>()
    for (const slug of readdirSync(templatesDir)) {
      for (const side of ['app', 'api']) {
        let pkg: {
          dependencies?: Record<string, string>
          devDependencies?: Record<string, string>
        }
        try {
          pkg = readJSON(join(templatesDir, slug, side, 'package.json'))
        } catch (_error) {
          continue // template without this side — not a fleet member for it
        }
        for (const [dep, version] of Object.entries({
          ...pkg.dependencies,
          ...pkg.devDependencies,
        })) {
          if (dep.startsWith('@molecule/')) continue
          let set = fleet.get(dep)
          if (!set) fleet.set(dep, (set = new Set()))
          set.add(version)
        }
      }
    }
    return fleet
  }

  const isExact = (v: string): boolean => /^\d/.test(v)

  it('template fleet pins each dep to a single version (no internal splits)', () => {
    // The two gates below use the fleet's unanimous pin as the reference and
    // skip deps the fleet disagrees on — so a split WITHIN the fleet would
    // silently disable them. It also means a dep bump missed some templates.
    // The fleet is 100% unanimous today (69/69 shared deps); keep it that way.
    const fleet = collectFleetPins()
    const splits: string[] = []
    for (const [dep, versions] of fleet) {
      if (versions.size > 1) {
        splits.push(`${dep}: ${[...versions].join(', ')}`)
      }
    }
    expect(
      splits,
      'templates disagree on dep versions — a dep bump missed part of the fleet; align them',
    ).toEqual([])
  })

  it('every registry version source matches the template fleet pins', () => {
    const fleet = collectFleetPins()
    expect(fleet.size).toBeGreaterThan(0)

    // Every place `mlcl create` reads a version from when scaffolding a
    // custom app. A dep bump that sweeps the templates must sweep these too.
    const sources: Array<[string, Record<string, string>]> = []
    for (const [section, deps] of Object.entries(registry.toolchain ?? {})) {
      sources.push([`toolchain.${section}`, deps as Record<string, string>])
    }
    for (const [fw, cfg] of Object.entries(registry.appFrameworks ?? {})) {
      sources.push([`appFrameworks.${fw}.dependencies`, cfg.dependencies ?? {}])
      sources.push([`appFrameworks.${fw}.devDependencies`, cfg.devDependencies ?? {}])
    }
    for (const [fw, cfg] of Object.entries(registry.apiFrameworks ?? {})) {
      sources.push([`apiFrameworks.${fw}.dependencies`, cfg.dependencies ?? {}])
      sources.push([`apiFrameworks.${fw}.devDependencies`, cfg.devDependencies ?? {}])
    }
    for (const [name, entry] of Object.entries(registry.packages ?? {})) {
      if (entry.buildTooling?.devDependencies) {
        sources.push([`${name}.buildTooling`, entry.buildTooling.devDependencies])
      }
    }

    const mismatches: string[] = []
    for (const [label, deps] of sources) {
      for (const [dep, version] of Object.entries(deps)) {
        const fleetSet = fleet.get(dep)
        if (fleetSet?.size !== 1) continue // absent from fleet, or fleet itself split
        const [fleetVersion] = fleetSet
        if (!isExact(fleetVersion) || !isExact(version)) continue
        if (fleetVersion !== version) {
          mismatches.push(`${label} ${dep}: registry=${version}, templates=${fleetVersion}`)
        }
      }
    }

    expect(
      mismatches,
      'registry pins drifted from the template fleet — a dep bump swept one side only; update registry.json (or the templates) so both agree',
    ).toEqual([])
  })

  it('template fleet pins match molecule package pins for shared deps', () => {
    // Sandboxes install molecule packages and the user app in one npm
    // workspace, so a dep pinned differently by a molecule package and by
    // the app splits the root node_modules hoist. Skips gracefully in a
    // standalone mlcl clone (no molecule sibling).
    const moleculeDir = join(mlclRoot, '..', 'molecule', 'packages')
    let moleculeStat
    try {
      moleculeStat = readdirSync(moleculeDir)
    } catch (_error) {
      return // standalone mlcl checkout — the workspace CI run covers this
    }
    expect(moleculeStat.length).toBeGreaterThan(0)

    const moleculePins = new Map<string, Set<string>>()
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (entry.name === 'package.json') {
          let pkg: {
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
          }
          try {
            pkg = readJSON(full)
          } catch (_error) {
            continue // unparsable stray file — not a package manifest
          }
          for (const [dep, version] of Object.entries({
            ...pkg.dependencies,
            ...pkg.devDependencies,
          })) {
            if (dep.startsWith('@molecule/')) continue
            let set = moleculePins.get(dep)
            if (!set) moleculePins.set(dep, (set = new Set()))
            set.add(version)
          }
        }
      }
    }
    walk(moleculeDir)

    const fleet = collectFleetPins()
    const mismatches: string[] = []
    for (const [dep, fleetSet] of fleet) {
      const molSet = moleculePins.get(dep)
      if (!molSet) continue
      const all = new Set([...fleetSet, ...molSet].filter((v) => isExact(v)))
      if (all.size > 1) {
        mismatches.push(
          `${dep}: templates=${[...fleetSet].join(',')} molecule=${[...molSet].join(',')}`,
        )
      }
    }

    expect(
      mismatches,
      'template fleet and molecule packages disagree on shared dep versions — this splits root hoisting in the sandbox npm workspace; align them',
    ).toEqual([])
  })

  it('no toolchain versions use ^ or ~ prefixes', () => {
    const unpinned: string[] = []

    for (const [section, deps] of Object.entries(registry.toolchain ?? {})) {
      if (typeof deps !== 'object' || deps === null) continue
      for (const [pkg, version] of Object.entries(deps as Record<string, string>)) {
        if (version.startsWith('^') || version.startsWith('~')) {
          unpinned.push(`${section}.${pkg}: ${version}`)
        }
      }
    }

    expect(unpinned, 'Toolchain versions must be pinned (no ^ or ~)').toEqual([])
  })

  // ---------------------------------------------------------------------
  // A SECOND RENDER PATH is the thing to notice (X0 rehearsals → A10).
  //
  // The blog template once served a dev page that did not match what its
  // build wrote, because the build prerenders and the dev server did not.
  // That bug class can only exist where a template renders by more than one
  // code path, and the fleet sweep of 2026-09-16 measured how many do: ONE.
  // Every other template app builds with the identical command and renders
  // through a single Vite pipeline in dev and in build, so there is nothing
  // for dev and build to disagree about.
  //
  // So this is not a sweep, it is a tripwire: when a template's build script
  // stops matching the fleet's, somebody has introduced a second path, and
  // that template's dev server has to be checked against its build before it
  // ships to users.
  // ---------------------------------------------------------------------

  describe('render paths', () => {
    /** What every template app builds with, unless it is listed below. */
    const FLEET_BUILD = 'tsc --noEmit && vite build'

    /**
     * Templates that deliberately render by a second path, with the reason and
     * the parity obligation that comes with it.
     */
    const SECOND_RENDER_PATH: Record<string, string> = {
      // Prerenders every route to static HTML after the bundle; its dev server
      // must render through the SAME entry, or dev and the published site differ.
      'static-site': 'tsc --noEmit && vite build && node scripts/prerender.mjs',
    }

    it('only the templates that declare a second render path have one', () => {
      const templatesDir = join(mlclRoot, 'templates', 'apps')
      const unexpected: string[] = []
      for (const slug of readdirSync(templatesDir)) {
        let build: string | undefined
        try {
          const pkg = readJSON(join(templatesDir, slug, 'app', 'package.json')) as {
            scripts?: Record<string, string>
          }
          build = pkg.scripts?.build
        } catch (_error) {
          continue // no app side
        }
        if (build === undefined) continue
        const allowed = SECOND_RENDER_PATH[slug] ?? FLEET_BUILD
        if (build !== allowed) unexpected.push(`${slug}: ${build}`)
      }
      expect(
        unexpected,
        'a template whose build differs from the fleet renders by a second path — check its dev ' +
          'server against its build, then add it to SECOND_RENDER_PATH with the reason',
      ).toEqual([])
    })
  })
})
