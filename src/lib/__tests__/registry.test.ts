import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { compareVersions } from '../package-upgrades.js'
import {
  clearRegistryCache,
  findPackageByRole,
  findRegistryPackage,
  getMoleculeVersion,
  getPackageStack,
  getRawRegistry,
  getRegistryPath,
  loadApiFrameworks,
  loadAppFrameworks,
  loadMoleculeVersions,
  loadRegistry,
  loadToolchain,
  requirePackageByRole,
} from '../registry.js'
import {
  extractHandlerMapKeys,
  ROUTE_SCANNED_TYPES,
  routesSignature,
  scanForRoutes,
  scanForTables,
  scanSetupSqlBundle,
} from '../scanner.js'
import { readPackageVersion } from '../setup-sql.js'
import { planSetupSqlEntrySync } from '../setup-sql-version.js'

describe('registry', () => {
  // These tests use the real registry.json

  beforeEach(() => {
    clearRegistryCache()
  })

  afterEach(() => {
    clearRegistryCache()
  })

  describe('loadRegistry', () => {
    it('should load all packages from registry.json', () => {
      const packages = loadRegistry()
      expect(packages.length).toBeGreaterThan(0)
    })

    it('should filter by api project type', () => {
      const apiPackages = loadRegistry('api')
      for (const pkg of apiPackages) {
        expect(pkg.molecule?.stack).toBe('api')
      }
    })

    it('should filter by app project type', () => {
      const appPackages = loadRegistry('app')
      for (const pkg of appPackages) {
        expect(pkg.molecule?.stack).toBe('app')
      }
    })

    it('should cache results between calls', () => {
      const first = loadRegistry()
      const second = loadRegistry()
      expect(first).toBe(second) // Same reference
    })

    it('should return sorted packages', () => {
      const packages = loadRegistry()
      const names = packages.map((p) => p.name)
      const sorted = [...names].sort()
      expect(names).toEqual(sorted)
    })
  })

  describe('table registration (scan-tables drift guard)', () => {
    // Regression guard for the registry `tables` drift that broke custom builds:
    // 38 resource packages had `__setup__` SQL on disk but empty `tables` in the
    // registry, so copySqlSetupScripts() skipped their DDL and assembled projects
    // 500'd at runtime ("column ... does not exist"). `tables` is now kept in sync
    // by `mlcl sync-registry --scan-tables`. This asserts the invariant holds: any
    // package shipping setup SQL must declare its tables so the scaffold copies them.
    //
    // A package whose checkout is AHEAD of its registry pin is skipped and named:
    // the entry describes the PINNED release, which may have shipped no SQL at
    // all, so requiring tables here made "the sibling gained setup SQL" a state no
    // registry could satisfy (P18 r11 review, R11-2).
    it('every package with setup SQL on disk declares non-empty tables', () => {
      const registry = getRawRegistry()
      const moleculeDir = join(dirname(getRegistryPath()), '..', 'molecule')
      const missing: string[] = []
      const skipped: string[] = []

      for (const [name, entry] of Object.entries(registry.packages)) {
        const base = join(moleculeDir, entry.path)
        const sourceVersion = readPackageVersion(base)
        const pinned = getMoleculeVersion(name)
        if (sourceVersion !== null && compareVersions(sourceVersion, pinned) > 0) {
          skipped.push(`${name} (source ${sourceVersion}, pinned ${pinned})`)
          continue
        }
        const setupDir = existsSync(join(base, 'setup'))
          ? join(base, 'setup')
          : join(base, 'src', '__setup__')
        let hasSql = false
        try {
          hasSql = readdirSync(setupDir).some((f) => f.endsWith('.sql'))
        } catch (_error) {
          // no setup dir — package ships no DDL, nothing to declare
        }
        const tables = (entry as { tables?: unknown[] }).tables
        if (hasSql && (!Array.isArray(tables) || tables.length === 0)) missing.push(name)
      }

      expect(
        missing,
        `packages with setup SQL but empty registry tables — run \`mlcl sync-registry --scan-tables\`: ${missing.join(', ')}` +
          (skipped.length ? `; skipped (sibling ahead of the pin): ${skipped.join(', ')}` : ''),
      ).toEqual([])
    })

    // `setupSql` is the registry's copy of the BYTES each declared file carries,
    // and `setupSqlVersion` the package version they belong to. It is what lets
    // a `--skip-install` scaffold (no molecule checkout, no installed fleet)
    // copy and preflight the real DDL — the production path that used to ship an
    // empty `__setup__/`. A stale copy is worse than none, so it must equal the
    // package's source byte for byte AND carry the source's own version: bytes
    // from another release are another schema. Both sides are derived here,
    // never listed by hand.
    //
    // The sibling comparison is tied to the PIN, and it is the SAME rule
    // `sync-registry --scan-tables`/`--check` applies (`planSetupSqlEntrySync`),
    // so a package cannot pass one gate and fail the other. Between a release's
    // `pins` push and the next `version` commit, a package can be AHEAD of the
    // version the registry pins — held by npm, blocked by an unserved dependency,
    // or simply not pinned yet. Its bundle then belongs to the older release the
    // pin names and no sibling bytes can match, so that entry keeps the pinned
    // release's metadata and is named as skipped, never silently ignored.
    // "Ahead" is decided from the sibling's OWN package.json version, so a
    // package that gained or dropped setup SQL is still recognized as ahead
    // (P18 r11 review, R11-2).
    it('every entry records the PINNED release’s setup SQL, byte-for-byte and tagged', async () => {
      const registry = getRawRegistry()
      const moleculeDir = join(dirname(getRegistryPath()), '..', 'molecule')
      const drifted: string[] = []
      const held: string[] = []
      const unresolved: string[] = []

      for (const [name, entry] of Object.entries(registry.packages)) {
        const base = join(moleculeDir, entry.path)
        // Standalone mlcl checkout: no molecule sibling to scan. The workspace
        // run covers this, and the zod schema still validates the shape.
        if (!existsSync(base)) continue
        const tables = (await scanForTables(base)).map((table) => ({
          name: table.name,
          sqlFile: relative(base, table.sqlFile),
        }))
        const plan = planSetupSqlEntrySync({
          name,
          entry,
          sibling: {
            tables,
            bundle: await scanSetupSqlBundle(base),
            version: readPackageVersion(base),
          },
          pinned: getMoleculeVersion(name),
        })
        if (plan.kind === 'update') drifted.push(name)
        else if (plan.kind === 'held') held.push(plan.detail)
        else if (plan.kind === 'unresolved') unresolved.push(plan.detail)
      }

      expect(
        unresolved,
        `the registry cannot record the pinned release's setup SQL — fix the entry (or check out the pin) before releasing: ${unresolved.join('; ')}`,
      ).toEqual([])
      expect(
        drifted,
        `registry setupSql/setupSqlVersion differs from the pinned package sources — run \`mlcl sync-registry --scan-tables\`: ${drifted.join(', ')}` +
          (held.length ? `; held (sibling ahead of the pin): ${held.join(', ')}` : ''),
      ).toEqual([])
    })
  })

  describe('route registration (scan-routes drift guard)', () => {
    // Regression guard for registry `routes` drift. `routes` was written once at
    // `mlcl init` and then only hand-edited, so it drifted from `src/routes.ts`:
    // project's entry carried `authenticate` — for project the GLOBAL auth marker
    // (applied app-wide via verifyMiddleware()), not a key of its
    // requestHandlerMap — so every scaffold emitted `Project.authenticate`
    // (TS2339 / undefined handler at boot); device and user were missing routes
    // added later; 47 resources had no routes at all. The registry copy is what a
    // scaffold wires (an npm-installed package has no src/ to scan), so it must
    // equal — route for route, in order — what the scanner derives from source.
    it('every route-scanned package declares exactly the routes src/routes.ts yields', async () => {
      const registry = getRawRegistry()
      const moleculeDir = join(dirname(getRegistryPath()), '..', 'molecule')
      const drifted: string[] = []

      for (const [name, entry] of Object.entries(registry.packages)) {
        if (!ROUTE_SCANNED_TYPES.has(entry.type)) continue
        const srcPath = join(moleculeDir, entry.path, 'src')
        if (!existsSync(srcPath)) continue
        const scanned = await scanForRoutes(srcPath)
        if (routesSignature(entry.routes) !== routesSignature(scanned)) drifted.push(name)
      }

      expect(
        drifted,
        `registry routes differ from src/routes.ts — run \`mlcl sync-registry --scan-routes\`: ${drifted.join(', ')}`,
      ).toEqual([])
    })

    it('every handler/middleware name it records is a key of that resource requestHandlerMap (the Resource.<unknown> class)', async () => {
      // The generated router emits `<Resource>.<name>` for every handler AND
      // middleware in a route, so each name must be a key of the resource's
      // requestHandlerMap — nothing else is exported under that alias. This is
      // deliberately by MEMBERSHIP, not by name: `authenticate` is the global
      // marker in project/activity-feed (dropped) but a real resource-local
      // authorizer key in grade (`authenticate: authenticate()`, kept).
      // The parser must also actually read every map it is asked to filter — an
      // empty key set makes the scanner keep middlewares as-is (a filter that
      // silently never ran), so a resource that ships requestHandlerMap.ts but
      // parses to zero keys fails here instead of shipping `Resource.<unknown>`.
      const registry = getRawRegistry()
      const moleculeDir = join(dirname(getRegistryPath()), '..', 'molecule')
      const offenders: string[] = []

      for (const [name, entry] of Object.entries(registry.packages)) {
        if (!entry.routes?.length) continue
        const srcPath = join(moleculeDir, entry.path, 'src')
        if (!existsSync(join(srcPath, 'requestHandlerMap.ts'))) continue
        const keys = await extractHandlerMapKeys(srcPath)
        if (keys.size === 0) {
          offenders.push(`${name}: requestHandlerMap.ts parsed to zero keys`)
          continue
        }
        for (const route of entry.routes) {
          for (const ref of [route.handler, ...route.middlewares]) {
            if (!keys.has(ref)) offenders.push(`${name} ${route.method} ${route.path} -> ${ref}`)
          }
        }
      }

      expect(offenders).toEqual([])
    })
  })

  describe('clearRegistryCache', () => {
    it('should invalidate cache', () => {
      const first = loadRegistry()
      clearRegistryCache()
      const second = loadRegistry()
      expect(first).not.toBe(second) // Different reference
    })
  })

  describe('findRegistryPackage', () => {
    it('should find existing package by name', () => {
      const pkg = findRegistryPackage('@molecule/api-database')
      expect(pkg).toBeDefined()
      expect(pkg!.name).toBe('@molecule/api-database')
    })

    it('should return undefined for non-existent package', () => {
      const pkg = findRegistryPackage('@molecule/nonexistent')
      expect(pkg).toBeUndefined()
    })
  })

  describe('getPackageStack', () => {
    it('should return api for API packages', () => {
      expect(getPackageStack('@molecule/api-database')).toBe('api')
    })

    it('should return app for App packages', () => {
      expect(getPackageStack('@molecule/app-i18n')).toBe('app')
    })

    it('should fall back to name-based inference', () => {
      expect(getPackageStack('@molecule/api-unknown-package')).toBe('api')
      expect(getPackageStack('@molecule/app-unknown-package')).toBe('app')
    })

    it('should return undefined for unrecognizable names', () => {
      expect(getPackageStack('@molecule/shared-something')).toBeUndefined()
    })
  })

  describe('findPackageByRole', () => {
    it('should find package by stack, type, and category', () => {
      const name = findPackageByRole('api', 'core', 'logger')
      expect(name).toBe('@molecule/api-logger')
    })

    it('should return undefined for non-existent role', () => {
      const name = findPackageByRole('api', 'core', 'nonexistent-category')
      expect(name).toBeUndefined()
    })
  })

  describe('requirePackageByRole', () => {
    it('should return package name for valid role', () => {
      const name = requirePackageByRole('api', 'core', 'logger')
      expect(name).toBe('@molecule/api-logger')
    })

    it('should throw for missing role', () => {
      expect(() => requirePackageByRole('api', 'core', 'nonexistent')).toThrow()
    })
  })

  describe('getRawRegistry', () => {
    it('should return full registry object', () => {
      const raw = getRawRegistry()
      expect(raw.version).toBe(1)
      expect(raw.packages).toBeDefined()
      expect(Object.keys(raw.packages).length).toBeGreaterThan(0)
    })
  })

  describe('getRegistryPath', () => {
    it('should return path to registry.json', () => {
      const path = getRegistryPath()
      expect(path.endsWith('registry.json')).toBe(true)
      expect(existsSync(path)).toBe(true)
    })
  })

  describe('loadApiFrameworks', () => {
    it('should return API framework configurations', () => {
      const frameworks = loadApiFrameworks()
      expect(frameworks.express).toBeDefined()
      expect(frameworks.express.dependencies).toBeDefined()
    })
  })

  describe('loadAppFrameworks', () => {
    it('should return app framework configurations', () => {
      const frameworks = loadAppFrameworks()
      expect(frameworks.react).toBeDefined()
      expect(frameworks.react.dependencies).toBeDefined()
    })
  })

  describe('loadToolchain', () => {
    it('should return toolchain with shared, api, app, and moleculePackage sections', () => {
      const toolchain = loadToolchain()
      expect(toolchain.shared).toBeDefined()
      expect(toolchain.api).toBeDefined()
      expect(toolchain.app).toBeDefined()
      expect(toolchain.moleculePackage).toBeDefined()
    })

    it('should include vitest in shared toolchain', () => {
      const toolchain = loadToolchain()
      expect(toolchain.shared.vitest || toolchain.moleculePackage.vitest).toBeDefined()
    })
  })

  describe('loadMoleculeVersions', () => {
    it('should return a default version and an overrides map', () => {
      const versions = loadMoleculeVersions()
      expect(typeof versions.default).toBe('string')
      expect(versions.default).not.toMatch(/^[\^~]/)
      expect(versions.overrides).toBeTypeOf('object')
    })
  })

  describe('getMoleculeVersion', () => {
    it('should resolve a real @molecule package to its exact registry version', () => {
      // Every registry package carries an override since the fleet-wide pin
      // bumps, so a real package resolves to its OVERRIDE (the unknown-package
      // fallback case is covered by the next test). Read the pair from the
      // registry instead of hardcoding a name+version that release waves drift.
      const { overrides } = loadMoleculeVersions()
      const [name, version] = Object.entries(overrides).find(([n]) =>
        n.startsWith('@molecule/api-'),
      )!
      expect(getMoleculeVersion(name)).toBe(version)
    })

    it('should fall back to the default for an unknown package', () => {
      const { default: def } = loadMoleculeVersions()
      expect(getMoleculeVersion('@molecule/does-not-exist')).toBe(def)
    })

    it('should never return a ranged version (exact pins only)', () => {
      expect(getMoleculeVersion('@molecule/api-database')).not.toMatch(/^[\^~>=<]/)
    })
  })
})
