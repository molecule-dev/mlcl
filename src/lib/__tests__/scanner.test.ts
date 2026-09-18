/**
 * Comprehensive test suite for the mlcl CLI scanner.
 *
 * Tests inferPackageType, scanPackage, and findMoleculePackages using
 * real packages from the monorepo as fixtures, plus temporary fixtures
 * for edge cases.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { resolvePackageDirectory } from '../scaffold.js'
import {
  findMoleculePackages,
  inferPackageType,
  scanExports,
  scanForRoutes,
  scanPackage,
  validatePackagePlacement,
} from '../scanner.js'

// ---------------------------------------------------------------------------
// Real package paths (used as fixtures)
// ---------------------------------------------------------------------------
const PACKAGES_ROOT = join(import.meta.dirname, '..', '..', '..', '..', 'molecule', 'packages')
const LOGGER_PATH = join(PACKAGES_ROOT, 'api', 'core', 'logger')
const GITHUB_OAUTH_PATH = join(PACKAGES_ROOT, 'api', 'bonds', 'oauth', 'github')
const USER_PATH = join(PACKAGES_ROOT, 'api', 'resources', 'user')
const DEVICE_PATH = join(PACKAGES_ROOT, 'api', 'resources', 'device')
const ACTIVITY_FEED_PATH = join(PACKAGES_ROOT, 'api', 'resources', 'activity-feed')
const PROJECT_PATH = join(PACKAGES_ROOT, 'api', 'resources', 'project')
const GRADE_PATH = join(PACKAGES_ROOT, 'api', 'resources', 'grade')
const CORS_PATH = join(PACKAGES_ROOT, 'api', 'middleware', 'cors')
const PASSWORD_PATH = join(PACKAGES_ROOT, 'api', 'core', 'password')
const BOND_PATH = join(PACKAGES_ROOT, 'api', 'infrastructure', 'bond')

// ---------------------------------------------------------------------------
// Temporary fixtures for edge cases
// ---------------------------------------------------------------------------
const tempDirs: string[] = []

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `scanner-test-${prefix}-`))
  tempDirs.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

// ============================================================================
// inferPackageType
// ============================================================================
describe('inferPackageType', () => {
  it('returns "core" for paths containing /core/', () => {
    expect(inferPackageType('/packages/api/core/logger')).toBe('core')
  })

  it('returns "bond" for paths containing /bonds/', () => {
    expect(inferPackageType('/packages/api/bonds/oauth/github')).toBe('bond')
  })

  it('returns "resource" for paths containing /resources/', () => {
    expect(inferPackageType('/packages/api/resources/user')).toBe('resource')
  })

  it('returns "middleware" for paths containing /middleware/', () => {
    expect(inferPackageType('/packages/api/middleware/cors')).toBe('middleware')
  })

  it('returns "utility" for paths containing /utilities/', () => {
    expect(inferPackageType('/packages/api/utilities/validation')).toBe('utility')
  })

  it('returns "infrastructure" for paths containing /infrastructure/', () => {
    expect(inferPackageType('/packages/api/infrastructure/bond')).toBe('infrastructure')
  })

  it('returns "utility" as default for unknown paths', () => {
    expect(inferPackageType('/some/random/path/package')).toBe('utility')
  })
})

// ============================================================================
// scanPackage
// ============================================================================
describe('scanPackage', () => {
  // --------------------------------------------------------------------------
  // Core package (logger)
  // --------------------------------------------------------------------------
  describe('core package (logger)', () => {
    it('scans name, version, and type correctly', async () => {
      const result = await scanPackage(LOGGER_PATH)
      expect(result.name).toBe('@molecule/api-logger')
      // Read the real manifest rather than hardcoding — this asserts the scanner
      // REPORTS the version, which a fleet bump must not invalidate.
      const manifest = JSON.parse(readFileSync(join(LOGGER_PATH, 'package.json'), 'utf-8'))
      expect(result.version).toBe(manifest.version)
      expect(result.type).toBe('core')
    })

    it('has no routes (core packages do not produce routes)', async () => {
      const result = await scanPackage(LOGGER_PATH)
      expect(result.routes).toEqual([])
    })

    it('has no tables', async () => {
      const result = await scanPackage(LOGGER_PATH)
      expect(result.tables).toEqual([])
    })

    it('has a src path', async () => {
      const result = await scanPackage(LOGGER_PATH)
      expect(result.srcPath).toBe(join(LOGGER_PATH, 'src'))
    })

    it('has molecule metadata from package.json', async () => {
      const result = await scanPackage(LOGGER_PATH)
      expect(result.molecule).toBeDefined()
      expect(result.molecule!.type).toBe('core')
      expect(result.molecule!.category).toBe('logger')
      expect(result.molecule!.label).toBe('Logger')
    })
  })

  // --------------------------------------------------------------------------
  // Bond package (oauth-github)
  // --------------------------------------------------------------------------
  describe('bond package (oauth-github)', () => {
    it('scans name and type correctly', async () => {
      const result = await scanPackage(GITHUB_OAUTH_PATH)
      expect(result.name).toBe('@molecule/api-oauth-github')
      expect(result.type).toBe('bond')
    })

    it('has README.md content', async () => {
      const result = await scanPackage(GITHUB_OAUTH_PATH)
      expect(result.moleculeMd).toBeDefined()
      expect(result.moleculeMd!.length).toBeGreaterThan(0)
    })

    it('has molecule metadata from package.json', async () => {
      const result = await scanPackage(GITHUB_OAUTH_PATH)
      expect(result.molecule).toBeDefined()
      expect(result.molecule!.type).toBe('provider')
      expect(result.molecule!.category).toBe('auth')
      expect(result.molecule!.implements).toBe('@molecule/api-oauth')
      expect(result.molecule!.secrets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'OAUTH_GITHUB_CLIENT_ID' }),
          expect.objectContaining({ name: 'OAUTH_GITHUB_CLIENT_SECRET' }),
        ]),
      )
    })

    it('has no routes (bonds do not produce routes)', async () => {
      const result = await scanPackage(GITHUB_OAUTH_PATH)
      expect(result.routes).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // Resource package (user)
  // --------------------------------------------------------------------------
  describe('resource package (user)', () => {
    it('scans name and type correctly', async () => {
      const result = await scanPackage(USER_PATH)
      expect(result.name).toBe('@molecule/api-resource-user')
      expect(result.type).toBe('resource')
    })

    it('has routes parsed from routes.ts', async () => {
      const result = await scanPackage(USER_PATH)
      expect(result.routes.length).toBeGreaterThan(0)
    })

    it('has tables from SQL setup files', async () => {
      const result = await scanPackage(USER_PATH)
      expect(result.tables.length).toBeGreaterThanOrEqual(2)
      const tableNames = result.tables.map((t) => t.name)
      expect(tableNames).toContain('users')
      expect(tableNames).toContain('usersSecrets')
    })

    it('has exports from index.ts', async () => {
      const result = await scanPackage(USER_PATH)
      expect(result.exports.length).toBeGreaterThan(0)
    })

    it('has molecule metadata', async () => {
      const result = await scanPackage(USER_PATH)
      expect(result.molecule).toBeDefined()
      expect(result.molecule!.type).toBe('resource')
      expect(result.molecule!.category).toBe('auth')
    })

    it('has README.md content', async () => {
      const result = await scanPackage(USER_PATH)
      expect(result.moleculeMd).toBeDefined()
    })
  })

  // --------------------------------------------------------------------------
  // Resource package (device)
  // --------------------------------------------------------------------------
  describe('resource package (device)', () => {
    it('scans name and type correctly', async () => {
      const result = await scanPackage(DEVICE_PATH)
      expect(result.name).toBe('@molecule/api-resource-device')
      expect(result.type).toBe('resource')
    })

    it('has routes parsed from routes.ts', async () => {
      const result = await scanPackage(DEVICE_PATH)
      expect(result.routes.length).toBeGreaterThan(0)
    })

    it('has tables from SQL setup', async () => {
      const result = await scanPackage(DEVICE_PATH)
      const tableNames = result.tables.map((t) => t.name)
      expect(tableNames).toContain('devices')
    })
  })

  // --------------------------------------------------------------------------
  // Middleware package (cors)
  // --------------------------------------------------------------------------
  describe('middleware package (cors)', () => {
    it('scans name and type correctly', async () => {
      const result = await scanPackage(CORS_PATH)
      expect(result.name).toBe('@molecule/api-middleware-cors')
      expect(result.type).toBe('middleware')
    })

    it('has no routes', async () => {
      const result = await scanPackage(CORS_PATH)
      expect(result.routes).toEqual([])
    })

    it('has molecule metadata', async () => {
      const result = await scanPackage(CORS_PATH)
      expect(result.molecule).toBeDefined()
      expect(result.molecule!.type).toBe('middleware')
      expect(result.molecule!.alwaysInclude).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // molecule metadata edge cases
  // --------------------------------------------------------------------------
  describe('molecule metadata', () => {
    it('reads molecule metadata from package.json when present', async () => {
      const result = await scanPackage(LOGGER_PATH)
      expect(result.molecule).toBeDefined()
      expect(result.molecule!.label).toBe('Logger')
    })

    it('returns undefined molecule when package.json has no molecule field', async () => {
      const dir = await createTempDir('no-molecule')
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({
          name: '@molecule/test-no-molecule',
          version: '0.0.1',
        }),
      )
      const result = await scanPackage(dir)
      expect(result.molecule).toBeUndefined()
    })
  })
})

// ============================================================================
// findMoleculePackages
// ============================================================================
describe('findMoleculePackages', () => {
  it('finds all packages under packages/api', async () => {
    const apiDir = join(PACKAGES_ROOT, 'api')
    const packages = await findMoleculePackages(apiDir)
    // There are many packages across core, bonds, infrastructure, resources, middleware, utilities
    expect(packages.length).toBeGreaterThanOrEqual(50)

    // Every result should be a path that was found
    for (const pkg of packages) {
      expect(typeof pkg).toBe('string')
    }
  })

  it('finds packages under packages/app', async () => {
    const appDir = join(PACKAGES_ROOT, 'app')
    const packages = await findMoleculePackages(appDir)
    expect(packages.length).toBeGreaterThanOrEqual(50)
  })

  it('returns empty array for directory with no @molecule packages', async () => {
    const dir = await createTempDir('empty')
    const packages = await findMoleculePackages(dir)
    expect(packages).toEqual([])
  })

  it('does not go deeper than 4 levels', async () => {
    const dir = await createTempDir('depth')
    // Create a package at depth 5 (should NOT be found)
    const deepDir = join(dir, 'a', 'b', 'c', 'd', 'e')
    await mkdir(deepDir, { recursive: true })
    await writeFile(
      join(deepDir, 'package.json'),
      JSON.stringify({ name: '@molecule/deep-package', version: '1.0.0' }),
    )

    // Create a package at depth 4 (should be found)
    const shallowDir = join(dir, 'a', 'b', 'c', 'd')
    await writeFile(
      join(shallowDir, 'package.json'),
      JSON.stringify({ name: '@molecule/shallow-package', version: '1.0.0' }),
    )

    const packages = await findMoleculePackages(dir)
    const names = await Promise.all(
      packages.map(async (p) => {
        const { default: fs } = await import('node:fs')
        return JSON.parse(fs.readFileSync(join(p, 'package.json'), 'utf-8')).name
      }),
    )

    expect(names).toContain('@molecule/shallow-package')
    expect(names).not.toContain('@molecule/deep-package')
  })
})

// ============================================================================
// Route scanning (via scanPackage)
// ============================================================================
describe('route scanning', () => {
  it('user resource has routes parsed from routes.ts', async () => {
    const result = await scanPackage(USER_PATH)
    const paths = result.routes.map((r) => `${r.method.toUpperCase()} ${r.path}`)

    expect(paths).toContain('POST /users')
    expect(paths).toContain('POST /users/log-in')
    expect(paths).toContain('GET /users/:id')
    expect(paths).toContain('PATCH /users/:id')
    expect(paths).toContain('DELETE /users/:id')
  })

  it('user resource has optional routes for OAuth', async () => {
    const result = await scanPackage(USER_PATH)
    const oauthRoute = result.routes.find((r) => r.path === '/users/log-in/oauth')
    expect(oauthRoute).toBeDefined()
    expect(oauthRoute!.optional).toBe('oauth')
  })

  it('user resource has optional routes for payments', async () => {
    const result = await scanPackage(USER_PATH)
    const paymentRoute = result.routes.find((r) => r.path === '/users/:id/verify-payment/:provider')
    expect(paymentRoute).toBeDefined()
    expect(paymentRoute!.optional).toBe('payments')
  })

  it('device resource has routes parsed from routes.ts', async () => {
    const result = await scanPackage(DEVICE_PATH)
    const paths = result.routes.map((r) => `${r.method.toUpperCase()} ${r.path}`)

    expect(paths).toContain('GET /devices')
    expect(paths).toContain('GET /devices/:id')
    expect(paths).toContain('PATCH /devices/:id')
    expect(paths).toContain('DELETE /devices/:id')
  })

  it('core package returns empty routes array', async () => {
    const result = await scanPackage(LOGGER_PATH)
    expect(result.routes).toEqual([])
  })

  it('route objects have method, path, handler, and middlewares fields', async () => {
    const result = await scanPackage(DEVICE_PATH)
    for (const route of result.routes) {
      expect(route).toHaveProperty('method')
      expect(route).toHaveProperty('path')
      expect(route).toHaveProperty('handler')
      expect(route).toHaveProperty('middlewares')
      expect(typeof route.method).toBe('string')
      expect(typeof route.path).toBe('string')
      expect(typeof route.handler).toBe('string')
      expect(Array.isArray(route.middlewares)).toBe(true)
    }
  })

  it('device routes include correct middlewares', async () => {
    const result = await scanPackage(DEVICE_PATH)
    const queryRoute = result.routes.find((r) => r.handler === 'query')
    expect(queryRoute).toBeDefined()
    expect(queryRoute!.middlewares).toContain('auth')

    const readRoute = result.routes.find((r) => r.handler === 'read')
    expect(readRoute).toBeDefined()
    expect(readRoute!.middlewares).toContain('authUser')
  })

  // The three tests below scan SOURCE via scanForRoutes(), not scanPackage():
  // scanPackage prefers the registry's pre-computed routes, and now that
  // `sync-registry --scan-routes` keeps every resource's entry populated, a
  // scanPackage-based assertion would pass on registry data without ever
  // exercising the handler-map filter it exists to test.
  it('drops the shared `authenticate` middleware (not a handler-map key) to prevent boot crash', async () => {
    // activity-feed routes declare middlewares: ['authenticate'], but `authenticate`
    // is the GLOBAL auth (applied app-wide via verifyMiddleware()), not in the
    // resource's requestHandlerMap. Emitting `Activity.authenticate` was `undefined`
    // → "argument handler must be a function" → the whole API failed to boot. It must
    // be filtered out; the route handlers (real map keys) must remain.
    const routes = await scanForRoutes(join(ACTIVITY_FEED_PATH, 'src'))
    expect(routes.length).toBeGreaterThan(0)
    for (const route of routes) {
      expect(route.middlewares).not.toContain('authenticate')
    }
    expect(routes.find((r) => r.handler === 'feed')).toBeDefined()
    expect(routes.find((r) => r.handler === 'logActivity')).toBeDefined()
  })

  it('drops `authenticate` while keeping the resource-local `authUser` on the same package (project)', async () => {
    // project mixes both on one routes.ts: create/list mark `authenticate`
    // (global), read/update/del mark `authUser` (a real map key). The filter
    // must be per-name, not per-file.
    const routes = await scanForRoutes(join(PROJECT_PATH, 'src'))
    const create = routes.find((r) => r.method === 'post' && r.path === '/projects')
    const read = routes.find((r) => r.method === 'get' && r.path === '/projects/:id')
    expect(create).toBeDefined()
    expect(read).toBeDefined()
    expect(create!.middlewares).toEqual([])
    expect(read!.middlewares).toEqual(['authUser'])
  })

  it('keeps resource-local authorizers that ARE handler-map keys (authSelf in User map)', async () => {
    const routes = await scanForRoutes(join(USER_PATH, 'src'))
    const readUser = routes.find((r) => r.path === '/users/:id' && r.method === 'get')
    expect(readUser).toBeDefined()
    expect(readUser!.middlewares).toContain('authSelf') // authSelf IS in User's map → kept
  })

  it('filters by map membership, not by name: grade keys its own `authenticate` authorizer and keeps it', async () => {
    // grade's requestHandlerMap has `authenticate: authenticate()` — a
    // resource-local authorizer that happens to share the global marker's
    // name. It is a real key, so `Grade.authenticate` resolves and must stay.
    const routes = await scanForRoutes(join(GRADE_PATH, 'src'))
    const list = routes.find((r) => r.method === 'get' && r.path === '/grades')
    expect(list).toBeDefined()
    expect(list!.middlewares).toEqual(['authenticate'])
  })

  it('user routes include correct middlewares', async () => {
    const result = await scanPackage(USER_PATH)
    const readRoute = result.routes.find((r) => r.method === 'get' && r.path === '/users/:id')
    expect(readRoute).toBeDefined()
    expect(readRoute!.middlewares).toContain('authSelf')

    const createRoute = result.routes.find((r) => r.method === 'post' && r.path === '/users')
    expect(createRoute).toBeDefined()
    expect(createRoute!.middlewares).toEqual([])
  })
})

// ============================================================================
// Table scanning (via scanPackage)
// ============================================================================
describe('table scanning', () => {
  it('user resource has users and usersSecrets tables', async () => {
    const result = await scanPackage(USER_PATH)
    const tableNames = result.tables.map((t) => t.name)
    expect(tableNames).toContain('users')
    expect(tableNames).toContain('usersSecrets')
  })

  it('user resource tables reference their SQL files', async () => {
    const result = await scanPackage(USER_PATH)
    for (const table of result.tables) {
      expect(table.sqlFile).toMatch(/\.sql$/)
    }
  })

  it('device resource has devices table', async () => {
    const result = await scanPackage(DEVICE_PATH)
    const tableNames = result.tables.map((t) => t.name)
    expect(tableNames).toContain('devices')
  })

  it('core package returns empty tables array', async () => {
    const result = await scanPackage(LOGGER_PATH)
    expect(result.tables).toEqual([])
  })

  it('middleware package returns empty tables array', async () => {
    const result = await scanPackage(CORS_PATH)
    expect(result.tables).toEqual([])
  })
})

// ============================================================================
// Export scanning (via scanPackage)
// ============================================================================
describe('export scanning', () => {
  it('logger package exports known names', async () => {
    const result = await scanPackage(LOGGER_PATH)
    // logger.ts exports: logger, setLogger, hasLogger
    // types.ts exports: LogLevel (type), Logger (interface)
    // The scanner follows star re-exports and picks up const/function/class/interface/type
    expect(result.exports).toContain('logger')
    expect(result.exports).toContain('setLogger')
    expect(result.exports).toContain('hasLogger')
  })

  it('bond infrastructure package exports known names', async () => {
    const result = await scanPackage(BOND_PATH)
    // bond.ts exports: bond, get, require, unbond, isBonded
    expect(result.exports).toContain('bond')
    expect(result.exports).toContain('get')
    expect(result.exports).toContain('require')
    expect(result.exports).toContain('unbond')
    expect(result.exports).toContain('isBonded')
  })

  it('github oauth bond exports known names', async () => {
    const result = await scanPackage(GITHUB_OAUTH_PATH)
    // provider.ts exports: serverName, verify
    // Note: `export type { ... } from` re-exports in types.ts are not captured
    // by the scanner's regex (it only follows `export *` and looks for
    // const/function/class/interface/type declarations)
    expect(result.exports).toContain('serverName')
    expect(result.exports).toContain('verify')
  })

  it('password core exports known names', async () => {
    const result = await scanPackage(PASSWORD_PATH)
    // provider.ts exports: setProvider, getProvider, hasProvider, hash, compare
    expect(result.exports).toContain('hash')
    expect(result.exports).toContain('compare')
    expect(result.exports).toContain('setProvider')
  })

  it('cors middleware exports known names', async () => {
    const result = await scanPackage(CORS_PATH)
    // cors.ts exports: cors, createCorsMiddleware
    expect(result.exports).toContain('cors')
    expect(result.exports).toContain('createCorsMiddleware')
  })

  it('exports are deduplicated', async () => {
    const result = await scanPackage(LOGGER_PATH)
    const uniqueExports = [...new Set(result.exports)]
    expect(result.exports.length).toBe(uniqueExports.length)
  })

  it('resolves `export * from` to .tsx component modules, not just .ts', async () => {
    // app/features/* re-export their public API from .tsx files
    // (`export * from './Widget.js'` → Widget.tsx). Resolving only .ts used to leave
    // those exports unscanned and emit a bare '*' instead.
    const dir = await createTempDir('tsx-reexport')
    await writeFile(
      join(dir, 'index.ts'),
      `export * from './Widget.js'\nexport * from './helpers.js'\n`,
    )
    await writeFile(
      join(dir, 'Widget.tsx'),
      `export function Widget(): null { return null }\nexport interface WidgetProps { x: number }\n`,
    )
    await writeFile(join(dir, 'helpers.ts'), `export const helper = 1\n`)

    const exports = await scanExports(dir)
    expect(exports).toContain('Widget') // from the .tsx
    expect(exports).toContain('WidgetProps') // from the .tsx
    expect(exports).toContain('helper') // from the .ts (unchanged)
    expect(exports).not.toContain('*') // everything resolved — no placeholder
  })
})

// ============================================================================
// Edge cases with temporary fixtures
// ============================================================================
describe('edge cases', () => {
  it('handles package with no src directory', async () => {
    const dir = await createTempDir('no-src')
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: '@molecule/test-no-src',
        version: '0.0.1',
      }),
    )
    const result = await scanPackage(dir)
    expect(result.srcPath).toBeUndefined()
    expect(result.exports).toEqual([])
    expect(result.routes).toEqual([])
    expect(result.tables).toEqual([])
  })

  it('handles package with empty src directory', async () => {
    const dir = await createTempDir('empty-src')
    await mkdir(join(dir, 'src'))
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: '@molecule/test-empty-src',
        version: '0.0.1',
      }),
    )
    const result = await scanPackage(dir)
    expect(result.srcPath).toBe(join(dir, 'src'))
    expect(result.exports).toEqual([])
    expect(result.routes).toEqual([])
  })

  it('throws when package.json is missing', async () => {
    const dir = await createTempDir('no-pkg-json')
    await expect(scanPackage(dir)).rejects.toThrow()
  })

  it('handles invalid molecule metadata gracefully', async () => {
    const dir = await createTempDir('invalid-molecule')
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: '@molecule/test-invalid-molecule',
        version: '0.0.1',
        molecule: { invalid: 'data' },
      }),
    )
    const result = await scanPackage(dir)
    // Invalid metadata should result in undefined molecule (safeParse fails)
    expect(result.molecule).toBeUndefined()
  })

  it('findMoleculePackages ignores non-@molecule packages', async () => {
    const dir = await createTempDir('non-molecule')
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'some-random-package',
        version: '1.0.0',
      }),
    )
    const packages = await findMoleculePackages(dir)
    expect(packages).toEqual([])
  })

  it('findMoleculePackages handles unreadable directories gracefully', async () => {
    // Pass a path that does not exist
    const packages = await findMoleculePackages('/nonexistent/path/that/does/not/exist')
    expect(packages).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// validatePackagePlacement
// ---------------------------------------------------------------------------
describe('validatePackagePlacement', () => {
  it('returns null for correctly placed core package', () => {
    const result = validatePackagePlacement({
      name: '@molecule/api-database',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'core',
      routes: [],
      tables: [],
      exports: [],
      path: '/repo/packages/api/core/database',
      molecule: { type: 'core', category: 'database', label: 'Database', secrets: [] },
    })
    expect(result).toBeNull()
  })

  it('returns null for correctly placed bond package', () => {
    const result = validatePackagePlacement({
      name: '@molecule/api-database-postgresql',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'bond',
      routes: [],
      tables: [],
      exports: [],
      path: '/repo/packages/api/bonds/database/postgresql',
      molecule: { type: 'provider', category: 'database', label: 'PostgreSQL', secrets: [] },
    })
    expect(result).toBeNull()
  })

  it('returns warning for misplaced package (provider in frameworks/)', () => {
    const result = validatePackagePlacement({
      name: '@molecule/app-ui-react',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'framework',
      routes: [],
      tables: [],
      exports: [],
      path: '/repo/packages/app/frameworks/react-ui',
      molecule: { type: 'provider', category: 'ui', label: 'React UI', secrets: [] },
    })
    expect(result).not.toBeNull()
    expect(result).toContain('molecule.type="provider"')
  })

  it('returns null for correctly placed framework package', () => {
    const result = validatePackagePlacement({
      name: '@molecule/app-ui-react',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'framework',
      routes: [],
      tables: [],
      exports: [],
      path: '/repo/packages/app/frameworks/react-ui',
      molecule: { type: 'framework', category: 'ui', label: 'React UI', secrets: [] },
    })
    expect(result).toBeNull()
  })

  it('returns null for correctly placed native package', () => {
    const result = validatePackagePlacement({
      name: '@molecule/app-geolocation',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'native',
      routes: [],
      tables: [],
      exports: [],
      path: '/repo/packages/app/native/geolocation',
      molecule: { type: 'native', category: 'geolocation', label: 'Geolocation', secrets: [] },
    })
    expect(result).toBeNull()
  })

  it('returns null when no molecule metadata present', () => {
    const result = validatePackagePlacement({
      name: '@molecule/api-test',
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'utility',
      routes: [],
      tables: [],
      exports: [],
      path: '/repo/packages/api/utilities/test',
    })
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// resolvePackageDirectory
// ---------------------------------------------------------------------------
describe('resolvePackageDirectory', () => {
  const ROOT = '/repo'

  it('resolves core package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'api-database',
        type: 'core',
        stack: 'api',
        category: 'database',
      }),
    ).toBe('/repo/packages/api/core/database')
  })

  it('resolves provider/bond package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'api-database-postgresql',
        type: 'provider',
        stack: 'api',
        category: 'database',
      }),
    ).toBe('/repo/packages/api/bonds/database/postgresql')
  })

  it('resolves resource package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'api-resource-user',
        type: 'resource',
        stack: 'api',
        category: 'auth',
      }),
    ).toBe('/repo/packages/api/resources/user')
  })

  it('resolves middleware package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'api-middleware-cors',
        type: 'middleware',
        stack: 'api',
        category: 'cors',
      }),
    ).toBe('/repo/packages/api/middleware/cors')
  })

  it('resolves utility package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'api-utilities-jwt',
        type: 'utility',
        stack: 'api',
        category: 'jwt',
      }),
    ).toBe('/repo/packages/api/utilities/jwt')
  })

  it('resolves infrastructure package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'api-bond',
        type: 'infrastructure',
        stack: 'api',
        category: 'bond',
      }),
    ).toBe('/repo/packages/api/infrastructure/bond')
  })

  it('resolves framework package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'app-react',
        type: 'framework',
        stack: 'app',
        category: 'react',
      }),
    ).toBe('/repo/packages/app/frameworks/react')
  })

  it('resolves feature package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'app-charts',
        type: 'feature',
        stack: 'app',
        category: 'charts',
      }),
    ).toBe('/repo/packages/app/features/charts')
  })

  it('resolves native package to correct directory', () => {
    expect(
      resolvePackageDirectory(ROOT, {
        name: 'app-geolocation',
        type: 'native',
        stack: 'app',
        category: 'geolocation',
      }),
    ).toBe('/repo/packages/app/native/geolocation')
  })

  it('throws on unknown type', () => {
    expect(() =>
      resolvePackageDirectory(ROOT, {
        name: 'test',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'unknown' as any,
        stack: 'api',
        category: 'test',
      }),
    ).toThrow('Unknown package type')
  })
})
