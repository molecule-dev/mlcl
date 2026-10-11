import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { BondSetup, InjectionPlan } from '../injector.js'
import {
  executeInjection,
  filterExcludedPeerDependencies,
  findMoleculePackage,
  generateBondSetupCode,
  generateBondsIndexContent,
  planInjection,
  synthesizeAppProjectFiles,
  synthesizeProjectFiles,
} from '../injector.js'
import { BROWSER_PROFILE_GATE } from '../migrate-runner.js'
import { getMoleculeVersion, loadMoleculeVersions, loadRegistry } from '../registry.js'
import { createTestProject } from './create-test-project.js'

// Load registry once — loadRegistry() caches internally
const registryPackages = loadRegistry()

// Temporary directories for tests
let tempDir: string
let testProject: string

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'mlcl-injector-test-'))
  testProject = await createTestProject()
})

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true })
  await rm(testProject, { recursive: true, force: true })
})

// ============================================================================
// findMoleculePackage
// ============================================================================

describe('findMoleculePackage', () => {
  it('finds @molecule/api-resource-user in node_modules', async () => {
    const result = await findMoleculePackage('@molecule/api-resource-user', testProject)
    expect(result).not.toBeNull()
    expect(result).toContain('node_modules/@molecule/api-resource-user')
  })

  it('finds @molecule/api-oauth-github in node_modules', async () => {
    const result = await findMoleculePackage('@molecule/api-oauth-github', testProject)
    expect(result).not.toBeNull()
    expect(result).toContain('node_modules/@molecule/api-oauth-github')
  })

  it('finds @molecule/api-payments-stripe in node_modules', async () => {
    const result = await findMoleculePackage('@molecule/api-payments-stripe', testProject)
    expect(result).not.toBeNull()
    expect(result).toContain('node_modules/@molecule/api-payments-stripe')
  })

  it('finds @molecule/api-middleware-cors in node_modules', async () => {
    const result = await findMoleculePackage('@molecule/api-middleware-cors', testProject)
    expect(result).not.toBeNull()
    expect(result).toContain('node_modules/@molecule/api-middleware-cors')
  })

  it('finds @molecule/api-logger in node_modules', async () => {
    const result = await findMoleculePackage('@molecule/api-logger', testProject)
    expect(result).not.toBeNull()
    expect(result).toContain('node_modules/@molecule/api-logger')
  })

  it('returns null for non-existent package', async () => {
    const result = await findMoleculePackage('@molecule/api-does-not-exist', testProject)
    expect(result).toBeNull()
  })

  it('returns null for empty project directory', async () => {
    const emptyDir = join(tempDir, 'empty-project')
    await mkdir(emptyDir, { recursive: true })
    const result = await findMoleculePackage('@molecule/api-logger', emptyDir)
    expect(result).toBeNull()
  })
})

// ============================================================================
// planInjection
// ============================================================================

describe('planInjection', () => {
  it('plans resource injection with SQL migrations', async () => {
    const plan = await planInjection('@molecule/api-resource-user', testProject)

    expect(plan.molecule).toBe('@molecule/api-resource-user')
    expect(plan.moleculePackage).toBeDefined()
    expect(plan.moleculePackage.type).toBe('resource')
    expect(plan.moleculePackage.name).toBe('@molecule/api-resource-user')
  })

  it('plans bond injection with setup code', async () => {
    const plan = await planInjection('@molecule/api-oauth-github', testProject)

    expect(plan.molecule).toBe('@molecule/api-oauth-github')
    expect(plan.moleculePackage).toBeDefined()
    expect(plan.moleculePackage.type).toBe('bond')
    expect(plan.bondSetup).not.toBeNull()
    expect(plan.bondSetup!.providerPackage).toBe('@molecule/api-oauth-github')
    expect(plan.bondSetup!.interfacePackage).toBe('@molecule/api-oauth')
    expect(plan.bondSetup!.setupCode).toContain("bond('oauth'")
  })

  it('plans payment bond injection', async () => {
    const plan = await planInjection('@molecule/api-payments-stripe', testProject)

    expect(plan.bondSetup).not.toBeNull()
    expect(plan.bondSetup!.setupCode).toContain("bond('payments', 'stripe'")
  })

  it('plans middleware injection', async () => {
    const plan = await planInjection('@molecule/api-middleware-cors', testProject)

    expect(plan.moleculePackage).toBeDefined()
    expect(plan.moleculePackage.type).toBe('middleware')
    expect(plan.dependencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '@molecule/api-middleware-cors' })]),
    )
    // Middleware packages ALSO produce a file plan: the always-emitted
    // `src/middleware/<shortName>.ts` setup file (the wiring into server.ts
    // comes from synthesizeProjectFiles on top of it). The old comment here
    // claimed no file plan, and no assertion covered the op — the middleware
    // setup file, its conflict check and the registry-declared companion
    // config were all uncovered.
    const middlewareFile = plan.files.find((op) =>
      op.targetPath.replaceAll('\\', '/').endsWith('src/middleware/cors.ts'),
    )
    expect(middlewareFile, 'the middleware setup file must be planned').toBeDefined()
    expect(middlewareFile?.action).toBe('create')
    expect(middlewareFile?.content.length ?? 0).toBeGreaterThan(0)
  })

  it('adds the package as a dependency', async () => {
    const plan = await planInjection('@molecule/api-logger', testProject)

    expect(plan.dependencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '@molecule/api-logger' })]),
    )
  })

  it('adds peer dependencies as regular dependencies', async () => {
    const plan = await planInjection('@molecule/api-oauth-github', testProject)

    // OAuth packages have @molecule/api-oauth as peer dependency
    expect(plan.dependencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '@molecule/api-oauth' })]),
    )
  })

  it('returns conflict for non-existent molecule', async () => {
    const plan = await planInjection('@molecule/api-nonexistent-xyz', testProject)

    expect(plan.conflicts.length).toBeGreaterThan(0)
    expect(plan.conflicts[0].message).toContain('Could not find molecule package')
  })
})

// ============================================================================
// excludePeerDependencies filtering (inject command logic)
// ============================================================================

describe('filterExcludedPeerDependencies', () => {
  /**
   * The same plan shape the react-native-web flow produces: the package
   * itself as a dependency plus its peer suggestions.
   */
  function planWithDeps(dependencies: InjectionPlan['dependencies']): InjectionPlan {
    return {
      molecule: '@molecule/app-ui-react-native',
      moleculePackage: {
        name: '@molecule/app-ui-react-native',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: { 'react-native': '*' },
        type: 'bond',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [],
      dependencies,
      migrations: [],
      bondSetup: null,
      conflicts: [],
    }
  }

  it('filters excluded peer dependencies across every plan, keeping the package and other peers', () => {
    const excluded = ['react-native']
    const filtered = planWithDeps([
      { name: '@molecule/app-ui-react-native', version: '1.0.0', type: 'dependency' },
      { name: 'react-native', version: '0.79.5', type: 'peerDependency' },
      { name: 'react', version: '19.2.4', type: 'peerDependency' },
    ])
    const untouched = planWithDeps([
      { name: 'react-native', version: '0.79.5', type: 'peerDependency' },
    ])

    // The REAL function the inject command runs after planning — a local
    // reimplementation here would pin nothing.
    filterExcludedPeerDependencies([filtered, untouched], excluded)

    expect(filtered.dependencies).toHaveLength(2)
    expect(filtered.dependencies.map((d) => d.name)).toContain('@molecule/app-ui-react-native')
    expect(filtered.dependencies.map((d) => d.name)).toContain('react')
    expect(filtered.dependencies.map((d) => d.name)).not.toContain('react-native')
    // Every plan in the call is filtered, not just the first.
    expect(untouched.dependencies).toHaveLength(0)
  })

  it('does not filter non-peer dependencies even if in excludedPeers', () => {
    const plan = planWithDeps([
      { name: 'react-native', version: '0.79.5', type: 'dependency' },
      { name: 'react-native', version: '0.79.5', type: 'devDependency' },
    ])

    filterExcludedPeerDependencies([plan], ['react-native'])

    // Regular/dev dependencies are NOT filtered, only peer deps.
    expect(plan.dependencies).toHaveLength(2)
    expect(plan.dependencies.map((d) => d.type)).toEqual(['dependency', 'devDependency'])
  })

  it('leaves the plans untouched when the exclusion list is empty', () => {
    const plan = planWithDeps([{ name: 'react-native', version: '0.79.5', type: 'peerDependency' }])

    filterExcludedPeerDependencies([plan], [])

    expect(plan.dependencies).toHaveLength(1)
  })
})

// ============================================================================
// executeInjection
// ============================================================================

describe('executeInjection', () => {
  it('returns immediately on dry run', async () => {
    const plan: InjectionPlan = {
      molecule: '@molecule/test',
      moleculePackage: {
        name: '@molecule/test',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: {},
        type: 'utility',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [
        {
          action: 'create',
          targetPath: join(tempDir, 'should-not-exist.ts'),
          content: 'test',
          description: 'test file',
        },
      ],
      dependencies: [],
      migrations: [],
      bondSetup: null,
      conflicts: [],
    }

    const result = await executeInjection(plan, tempDir, { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.filesCreated).toHaveLength(0)
  })

  it('creates files from plan', async () => {
    const projectDir = join(tempDir, 'exec-test-create')
    await mkdir(join(projectDir, 'src'), { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    const plan: InjectionPlan = {
      molecule: '@molecule/test',
      moleculePackage: {
        name: '@molecule/test',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: {},
        type: 'utility',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [
        {
          action: 'create',
          targetPath: join(projectDir, 'src', 'test.ts'),
          content: 'export const test = true\n',
          description: 'Create test file',
        },
      ],
      dependencies: [],
      migrations: [],
      bondSetup: null,
      conflicts: [],
    }

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(true)
    expect(result.filesCreated).toContain(join(projectDir, 'src', 'test.ts'))

    const content = await readFile(join(projectDir, 'src', 'test.ts'), 'utf-8')
    expect(content).toBe('export const test = true\n')
  })

  it('creates migration files', async () => {
    const projectDir = join(tempDir, 'exec-test-migration')
    await mkdir(projectDir, { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    const plan: InjectionPlan = {
      molecule: '@molecule/test',
      moleculePackage: {
        name: '@molecule/test',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: {},
        type: 'resource',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [],
      dependencies: [],
      migrations: [
        {
          name: '001_create_test.sql',
          content: 'CREATE TABLE "test" ("id" VARCHAR(36) PRIMARY KEY);',
          tableName: 'test',
        },
      ],
      bondSetup: null,
      conflicts: [],
    }

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(true)
    expect(result.filesCreated).toEqual(
      expect.arrayContaining([expect.stringContaining('001_create_test.sql')]),
    )
  })

  it('skips conflicting files when not forced', async () => {
    const projectDir = join(tempDir, 'exec-test-conflict')
    await mkdir(join(projectDir, 'src'), { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    const targetPath = join(projectDir, 'src', 'existing.ts')
    await writeFile(targetPath, 'original content')

    const plan: InjectionPlan = {
      molecule: '@molecule/test',
      moleculePackage: {
        name: '@molecule/test',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: {},
        type: 'utility',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [
        {
          action: 'create',
          targetPath,
          content: 'new content',
          description: 'Should be skipped',
        },
      ],
      dependencies: [],
      migrations: [],
      bondSetup: null,
      conflicts: [{ path: targetPath, message: 'File exists', resolution: 'skip' }],
    }

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Skipped')]))

    // Original content preserved
    const content = await readFile(targetPath, 'utf-8')
    expect(content).toBe('original content')
  })

  it('appends content for modify action', async () => {
    const projectDir = join(tempDir, 'exec-test-modify')
    await mkdir(join(projectDir, 'src'), { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    const targetPath = join(projectDir, 'src', 'index.ts')
    await writeFile(targetPath, 'export * from "./a.js"\n')

    const plan: InjectionPlan = {
      molecule: '@molecule/test',
      moleculePackage: {
        name: '@molecule/test',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: {},
        type: 'utility',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [
        {
          action: 'modify',
          targetPath,
          content: 'export * from "./b.js"\n',
          description: 'Add b export',
        },
      ],
      dependencies: [],
      migrations: [],
      bondSetup: null,
      conflicts: [],
    }

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(true)

    const content = await readFile(targetPath, 'utf-8')
    expect(content).toContain('export * from "./a.js"')
    expect(content).toContain('export * from "./b.js"')
  })
})

// ============================================================================
// synthesizeProjectFiles
// ============================================================================

describe('synthesizeProjectFiles', () => {
  let userPlan: InjectionPlan
  let devicePlan: InjectionPlan

  beforeAll(async () => {
    // Create real plans from actual packages
    userPlan = await planInjection('@molecule/api-resource-user', testProject)
    devicePlan = await planInjection('@molecule/api-resource-device', testProject)
  })

  it('generates router.ts', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan, devicePlan],
      ['@molecule/api-resource-user', '@molecule/api-resource-device', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const router = files.find((f) => f.targetPath.includes('router.ts'))
    expect(router).toBeDefined()
    expect(router!.content).toContain("import { Router } from 'express'")
    expect(router!.content).toContain('export const router = Router()')
  })

  it('generates server.ts', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      [
        '@molecule/api-resource-user',
        '@molecule/api-resource',
        '@molecule/api-logger',
        '@molecule/api-middleware-cors',
      ],
      tempDir,
      registryPackages,
    )

    const server = files.find((f) => f.targetPath.includes('server.ts'))
    expect(server).toBeDefined()
    expect(server!.content).toContain("import express from 'express'")
    expect(server!.content).toContain('setupBonds()')
    expect(server!.content).toContain('/health')
    expect(server!.content).toContain("import { logger } from '@molecule/api-logger'")
    expect(server!.content).toContain('corsMiddleware')
  })

  it('generates server.ts without optional middleware', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const server = files.find((f) => f.targetPath.includes('server.ts'))
    expect(server).toBeDefined()
    // Should use express.json() as fallback when no body-parser is installed —
    // with the parser's verify callback saving the RAW request bytes to
    // req.rawBody: webhook signature verification (Stripe, GitHub, …) HMACs the
    // exact bytes, which the parsed req.body no longer carries. A bare
    // express.json() leaves every req.rawBody reader (the stripe-checkout
    // example's webhook handler among them) rejecting legitimate deliveries
    // with "Missing raw body".
    expect(server!.content).toContain('express.json({ verify:')
    expect(server!.content).toContain('.rawBody = buf.toString(')
    // Should not have middleware imports
    expect(server!.content).not.toContain('corsMiddleware')
  })

  // Security regression (finding L1-2): the generated error handler must never
  // delegate to Express's default finalhandler, which leaks err.stack (absolute
  // file paths, dependency internals, error text) to clients whenever
  // NODE_ENV !== 'production'. It must always send a sanitized 500 instead.
  it('generates an error handler that sanitizes 500s and never delegates to Express default', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource', '@molecule/api-logger'],
      tempDir,
      registryPackages,
    )

    const server = files.find((f) => f.targetPath.includes('server.ts'))
    expect(server).toBeDefined()

    // Exploit blocked: the handler must NOT fall through to Express's default
    // error handler (no next(error) — that path returns err.stack to clients).
    expect(server!.content).not.toContain('next(error)')

    // Safe-by-construction: always respond with a generic 500 body, guarded so
    // an already-started response isn't double-sent. This matches the safe base
    // template (templates/api/server.ts.tpl) and is independent of NODE_ENV.
    expect(server!.content).toContain("res.status(500).json({ error: 'Internal Server Error' })")
    expect(server!.content).toContain('if (!res.headersSent) {')

    // Legitimate behavior preserved: the 401 Unauthorized branch still works.
    expect(server!.content).toContain('res.status(401).send(error)')
  })

  it('generates a SQLite-specific migrate.ts when sqlite is the chosen database', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-database-sqlite', '@molecule/api-database'],
      tempDir,
      registryPackages,
    )

    const migrate = files.find((f) => f.targetPath.endsWith('scripts/migrate.ts'))
    expect(migrate).toBeDefined()
    // SQLite runner delegates to the bond's createMigrator — no pg driver / createdb.
    expect(migrate!.content).toContain("from '@molecule/api-database-sqlite'")
    expect(migrate!.content).toContain('createMigrator')
    expect(migrate!.content).not.toContain("from 'pg'")
    expect(migrate!.content).not.toContain('CREATE DATABASE')
  })

  it('generates a MySQL-specific migrate.ts when mysql is the chosen database', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-database-mysql', '@molecule/api-database'],
      tempDir,
      registryPackages,
    )

    const migrate = files.find((f) => f.targetPath.endsWith('scripts/migrate.ts'))
    expect(migrate).toBeDefined()
    // MySQL runner delegates to the bond's createMigrator — no pg driver.
    expect(migrate!.content).toContain("from '@molecule/api-database-mysql'")
    expect(migrate!.content).toContain('createMigrator')
    expect(migrate!.content).not.toContain("from 'pg'")
  })

  it('generates the Postgres migrate.ts for a postgres database (default, unchanged)', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-database-postgresql', '@molecule/api-database'],
      tempDir,
      registryPackages,
    )

    const migrate = files.find((f) => f.targetPath.endsWith('scripts/migrate.ts'))
    expect(migrate).toBeDefined()
    expect(migrate!.content).toContain("import pg from 'pg'")
    expect(migrate!.content).toContain('CREATE DATABASE')
    expect(migrate!.content).not.toContain('@molecule/api-database-sqlite')
    expect(migrate!.content).not.toContain('@molecule/api-database-mysql')
  })

  it('renders migrate.ts from the target manifest ∪ the injected list — one injected database never erases a declared one', async () => {
    // `mlcl add @molecule/api-database-pglite --inject` into an existing
    // Postgres project: add writes the pglite dep into the api manifest
    // BEFORE the handoff, then runs `inject --molecule
    // @molecule/api-database-pglite` — so the injector's list is that ONE
    // package while the manifest still declares the project's real database.
    // Rendering from the list alone shipped a PGlite-only runner that
    // silently stopped migrating Postgres (and the reverse injection
    // dead-gated a browser-profile app's only database).
    const postgresProject = await mkdtemp(join(tmpdir(), 'mlcl-injector-manifest-'))
    try {
      await writeFile(
        join(postgresProject, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@molecule/api-database-postgresql': '1.0.5',
            '@molecule/api-database-pglite': '1.0.0',
          },
        }),
      )
      const files = await synthesizeProjectFiles(
        [userPlan],
        ['@molecule/api-database-pglite', '@molecule/api-database'],
        postgresProject,
        registryPackages,
      )

      const migrate = files.find((f) => f.targetPath.endsWith('scripts/migrate.ts'))
      expect(migrate).toBeDefined()
      // The dual runner: the manifest's Postgres machinery is kept…
      expect(migrate!.content).toContain("import pg from 'pg'")
      expect(migrate!.content).toContain('CREATE DATABASE')
      // …and the injected PGlite's browser branch is reachable, not dead-gated:
      // the whole right-hand side is the profile comparison (the SAME literal
      // the renderer exports, so this cannot drift from what it writes).
      expect(migrate!.content).toContain(`const BROWSER_PROFILE = ${BROWSER_PROFILE_GATE}`)
      expect(migrate!.content).not.toContain('const BROWSER_PROFILE = false')
      // A literal glued to the gate with `&&` is a no-constant-binary-expression
      // error under the eslint config every scaffolded project ships, so the
      // emitted runner would fail its own `npm run lint`.
      expect(migrate!.content).not.toContain('const BROWSER_PROFILE = true &&')
      expect(migrate!.content).not.toContain('const BROWSER_PROFILE = false &&')
    } finally {
      await rm(postgresProject, { recursive: true, force: true })
    }
  })

  it('generates bonds/index.ts', async () => {
    const oauthPlan = {
      ...userPlan,
      bondSetup: {
        providerPackage: '@molecule/api-oauth-github',
        interfacePackage: '@molecule/api-oauth',
        interfaceType: 'oauth',
        setupCode: 'mock',
      } as BondSetup,
    }

    const files = await synthesizeProjectFiles(
      [oauthPlan],
      ['@molecule/api-oauth-github'],
      tempDir,
      registryPackages,
    )

    const bondsIndex = files.find((f) => f.targetPath.includes('bonds/index.ts'))
    expect(bondsIndex).toBeDefined()
    expect(bondsIndex!.content).toContain('setupBonds')
  })

  it('generates User resource wrapper', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const wrapper = files.find((f) => f.targetPath.includes('Resource/User/index.ts'))
    expect(wrapper).toBeDefined()
    expect(wrapper!.content).toContain('createRequestHandlerMap')
    expect(wrapper!.content).toContain('createRequestHandler')
    expect(wrapper!.content).toContain('authorization')
  })

  it('generates Device resource wrapper', async () => {
    const files = await synthesizeProjectFiles(
      [devicePlan],
      ['@molecule/api-resource-device', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const wrapper = files.find((f) => f.targetPath.includes('Resource/Device/index.ts'))
    expect(wrapper).toBeDefined()
    expect(wrapper!.content).toContain('createRequestHandlerMap')
    expect(wrapper!.content).toContain('createRequestHandler')
  })

  it('generates service bond for device', async () => {
    const files = await synthesizeProjectFiles(
      [devicePlan],
      ['@molecule/api-resource-device', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const serviceBond = files.find((f) => f.targetPath.includes('service-device.ts'))
    expect(serviceBond).toBeDefined()
    expect(serviceBond!.content).toContain("bond('device', deviceService)")
  })

  it('generates service bond for payment', async () => {
    const files = await synthesizeProjectFiles(
      [],
      ['@molecule/api-resource-payment'],
      tempDir,
      registryPackages,
    )

    const serviceBond = files.find((f) => f.targetPath.includes('service-payment.ts'))
    expect(serviceBond).toBeDefined()
    expect(serviceBond!.content).toContain("bond('plans', planService)")
    expect(serviceBond!.content).toContain("bond('paymentRecords', paymentRecordService)")
  })

  it('filters optional routes based on installed molecules', async () => {
    // Without stripe installed, stripe routes should be excluded
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const router = files.find((f) => f.targetPath.includes('router.ts'))
    expect(router).toBeDefined()
    expect(router!.content).not.toContain('verifyStripeSubscription')
    expect(router!.content).not.toContain('verify-stripe-subscription')
  })

  it('includes optional routes when feature is installed', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource', '@molecule/api-payments-stripe'],
      tempDir,
      registryPackages,
    )

    const router = files.find((f) => f.targetPath.includes('router.ts'))
    expect(router).toBeDefined()
    expect(router!.content).toContain('verifyPayment')
  })

  it('generates smoke tests', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const serverTest = files.find((f) => f.targetPath.includes('server.test.ts'))
    expect(serverTest).toBeDefined()
    expect(serverTest!.content).toContain('vi.mock')
    expect(serverTest!.content).toContain("import { describe, expect, it, vi } from 'vitest'")

    const routeTest = files.find((f) => f.targetPath.includes('routes.test.ts'))
    expect(routeTest).toBeDefined()
    expect(routeTest!.content).toContain('requestHandlerMap')
  })

  it('applies User authorization middleware globally', async () => {
    const files = await synthesizeProjectFiles(
      [userPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const router = files.find((f) => f.targetPath.includes('router.ts'))
    expect(router).toBeDefined()
    expect(router!.content).toContain('userAuthorization.verifyMiddleware()')
  })

  it('emits only requestHandlerMap members for route middlewares (project: `authenticate` is global, `authUser` is a key)', async () => {
    // Regression: registry.json's project routes carried `authenticate` — the
    // GLOBAL auth marker applied app-wide via verifyMiddleware(), not a key of
    // the resource's requestHandlerMap — so the generated router referenced
    // `Project.authenticate`: TS2339 in every scaffold that pulled the resource
    // (typecheck:scaffolds `api-resources-rich`) and an undefined handler at
    // boot. The router is generated from the registry's routes, so this holds
    // only while `sync-registry --scan-routes` keeps them equal to the scanner's
    // handler-map-filtered output. A minimal project that merely DECLARES the
    // dependency is enough: findMoleculePackage falls back to the registry path.
    const projectDir = join(tempDir, 'declares-project-resource')
    await mkdir(projectDir, { recursive: true })
    await writeFile(
      join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'declares-project-resource',
        version: '1.0.0',
        type: 'module',
        dependencies: { '@molecule/api-resource-project': '1.0.0' },
      }),
    )
    const projectPlan = await planInjection('@molecule/api-resource-project', projectDir)
    expect(projectPlan.moleculePackage?.name).toBe('@molecule/api-resource-project')

    const files = await synthesizeProjectFiles(
      [userPlan, projectPlan],
      ['@molecule/api-resource-user', '@molecule/api-resource-project', '@molecule/api-resource'],
      tempDir,
      registryPackages,
    )

    const router = files.find((f) => f.targetPath.includes('router.ts'))
    expect(router).toBeDefined()
    // Global auth is applied once, app-wide — never as a per-route handler ref.
    expect(router!.content).toContain('userAuthorization.verifyMiddleware()')
    expect(router!.content).not.toContain('Project.authenticate')
    // The resource-local authorizer IS a map key and must survive the filter.
    expect(router!.content).toContain('Project.authUser')
    expect(router!.content).toContain('Project.create')
    expect(router!.content).toContain('Project.list')
  })
})

// ============================================================================
// generateBondsIndexContent
// ============================================================================

describe('generateBondsIndexContent', () => {
  it('generates empty bonds index when no setups', () => {
    const content = generateBondsIndexContent([], [])
    expect(content).toContain('setupBonds')
    expect(content).toContain('No providers to wire')
  })

  it('generates index with bond setups', () => {
    const setups: BondSetup[] = [
      {
        providerPackage: '@molecule/api-oauth-github',
        interfacePackage: '@molecule/api-oauth',
        interfaceType: 'oauth',
        setupCode: 'mock',
      },
      {
        providerPackage: '@molecule/api-emails-sendgrid',
        interfacePackage: '@molecule/api-emails',
        interfaceType: 'email',
        setupCode: 'mock',
      },
    ]

    const content = generateBondsIndexContent(setups)
    expect(content).toContain('setupOauthGithub')
    expect(content).toContain('setupEmailsSendgrid')
    expect(content).toContain("from './oauth-github.js'")
    expect(content).toContain("from './emails-sendgrid.js'")
    expect(content).toContain('export async function setupBonds')
  })

  it('puts service bonds before provider bonds', () => {
    const setups: BondSetup[] = [
      {
        providerPackage: '@molecule/api-oauth-github',
        interfacePackage: '@molecule/api-oauth',
        interfaceType: 'oauth',
        setupCode: 'mock',
      },
    ]

    const content = generateBondsIndexContent(setups, ['service-device', 'service-payment'])
    const serviceDeviceIdx = content.indexOf('setupServiceDevice()')
    const oauthIdx = content.indexOf('setupOauthGithub()')
    expect(serviceDeviceIdx).toBeLessThan(oauthIdx)
  })

  it('does not re-export bond modules (avoids TS2308 conflicts)', () => {
    const setups: BondSetup[] = [
      {
        providerPackage: '@molecule/api-emails-mailgun',
        interfacePackage: '@molecule/api-emails',
        interfaceType: 'email',
        setupCode: 'mock',
      },
    ]

    const content = generateBondsIndexContent(setups)
    expect(content).not.toContain("export * from './emails-mailgun.js'")
    expect(content).toContain("import { setupEmailsMailgun } from './emails-mailgun.js'")
  })

  it('wires setupEntitlements when @molecule/api-entitlements is in allMolecules', () => {
    const setups: BondSetup[] = [
      {
        providerPackage: '@molecule/api-payments-stripe',
        interfacePackage: '@molecule/api-payments',
        interfaceType: 'payments',
        setupCode: 'mock',
      },
    ]

    const content = generateBondsIndexContent(
      setups,
      [],
      [],
      ['@molecule/api-entitlements', '@molecule/api-payments-stripe'],
    )

    expect(content).toContain("import { setupEntitlements } from '../tiers.js'")
    expect(content).toContain('setupEntitlements()')
    // Order: setupEntitlements should come after secrets resolveAll and before provider bonds.
    const resolveIdx = content.indexOf('resolveAll(')
    const entitlementsIdx = content.indexOf('setupEntitlements()')
    const paymentsIdx = content.indexOf('setupPaymentsStripe()')
    expect(resolveIdx).toBeGreaterThanOrEqual(0)
    expect(entitlementsIdx).toBeGreaterThan(resolveIdx)
    expect(paymentsIdx).toBeGreaterThan(entitlementsIdx)
  })

  it('omits entitlements wiring when @molecule/api-entitlements is not selected', () => {
    const setups: BondSetup[] = [
      {
        providerPackage: '@molecule/api-payments-stripe',
        interfacePackage: '@molecule/api-payments',
        interfaceType: 'payments',
        setupCode: 'mock',
      },
    ]

    const content = generateBondsIndexContent(setups, [], [], ['@molecule/api-payments-stripe'])

    expect(content).not.toContain("from '../tiers.js'")
    expect(content).not.toContain('setupEntitlements()')
  })
})

// ============================================================================
// synthesizeAppProjectFiles — service worker generation
// ============================================================================

describe('synthesizeAppProjectFiles', () => {
  const makePlan = (molecule: string, bondSetup?: BondSetup): InjectionPlan => ({
    molecule,
    moleculePackage: {
      name: molecule,
      version: '1.0.0',
      type: 'core',
      routes: [],
      tables: [],
      exports: [],
      path: '/tmp/test-app',
    },
    files: [],
    dependencies: [],
    migrations: [],
    bondSetup: bondSetup ?? null,
    conflicts: [],
  })

  it('generates service-worker.ts when @molecule/app-version is included', () => {
    const plans = [makePlan('@molecule/app-version')]
    const molecules = ['@molecule/app-version']

    const files = synthesizeAppProjectFiles(plans, molecules, '/tmp/test-app', registryPackages)

    const swFile = files.find((f) => f.targetPath.endsWith('service-worker.ts'))
    expect(swFile).toBeDefined()
    expect(swFile!.content).toContain('precacheAndRoute')
    expect(swFile!.content).toContain('SKIP_WAITING')
    expect(swFile!.content).toContain("createHandlerBoundToURL('/index.html')")
  })

  it('does not generate service-worker.ts without @molecule/app-version', () => {
    const plans = [makePlan('@molecule/app-auth')]
    const molecules = ['@molecule/app-auth']

    const files = synthesizeAppProjectFiles(plans, molecules, '/tmp/test-app', registryPackages)

    const swFile = files.find((f) => f.targetPath.endsWith('service-worker.ts'))
    expect(swFile).toBeUndefined()
  })

  it('includes push notification handlers when @molecule/app-push is included', () => {
    const plans = [makePlan('@molecule/app-version'), makePlan('@molecule/app-push')]
    const molecules = ['@molecule/app-version', '@molecule/app-push']

    const files = synthesizeAppProjectFiles(plans, molecules, '/tmp/test-app', registryPackages)

    const swFile = files.find((f) => f.targetPath.endsWith('service-worker.ts'))
    expect(swFile).toBeDefined()
    expect(swFile!.content).toContain("addEventListener('push'")
    expect(swFile!.content).toContain('showNotification')
    expect(swFile!.content).toContain('onnotificationclick')
    expect(swFile!.content).toContain("case 'WINDOW_FOCUSED':")
  })

  it('excludes push handlers when only version is included', () => {
    const plans = [makePlan('@molecule/app-version')]
    const molecules = ['@molecule/app-version']

    const files = synthesizeAppProjectFiles(plans, molecules, '/tmp/test-app', registryPackages)

    const swFile = files.find((f) => f.targetPath.endsWith('service-worker.ts'))
    expect(swFile).toBeDefined()
    expect(swFile!.content).not.toContain("addEventListener('push'")
    expect(swFile!.content).not.toContain('showNotification')
    expect(swFile!.content).not.toContain("case 'WINDOW_FOCUSED':")
  })

  it('always generates bonds/index.ts', () => {
    const plans = [makePlan('@molecule/app-version')]
    const molecules = ['@molecule/app-version']

    const files = synthesizeAppProjectFiles(plans, molecules, '/tmp/test-app', registryPackages)

    const bondsFile = files.find((f) => f.targetPath.endsWith('bonds/index.ts'))
    expect(bondsFile).toBeDefined()
    expect(bondsFile!.content).toContain('setupProviders')
  })

  it('re-exports providers with appBondSetup.reExport from registry', () => {
    // Create a plan with a bond setup that has appBondSetup metadata via the registry
    const themePlan: InjectionPlan = {
      molecule: '@molecule/app-theme-css-variables',
      moleculePackage: {
        name: '@molecule/app-theme-css-variables',
        version: '1.0.0',
        type: 'provider',
        routes: [],
        tables: [],
        exports: ['createCSSVariablesThemeProvider', 'lightTheme', 'darkTheme'],
        path: '/tmp/test-app',
        molecule: {
          category: 'theme',
          implements: '@molecule/app-theme',
          appBondSetup: {
            exportName: 'themeProvider',
            reExport: true,
            generatorType: 'theme',
          },
        },
      },
      files: [],
      dependencies: [],
      migrations: [],
      bondSetup: {
        providerPackage: '@molecule/app-theme-css-variables',
        interfacePackage: '@molecule/app-theme',
        interfaceType: 'theme',
        setupCode: 'mock',
      },
      conflicts: [],
    }

    const files = synthesizeAppProjectFiles(
      [themePlan],
      ['@molecule/app-theme-css-variables', '@molecule/app-theme'],
      '/tmp/test-app',
      registryPackages,
    )

    const bondsFile = files.find((f) => f.targetPath.endsWith('bonds/index.ts'))
    expect(bondsFile).toBeDefined()
    expect(bondsFile!.content).toContain(
      "export { themeProvider } from './app-theme-css-variables.js'",
    )
  })

  it('omits the Theme type import when the project has no theme.css color overrides', async () => {
    // tempDir ships no theme.css, so the generated theme bond takes the
    // no-custom-colors branch and never declares a typed `Theme` constant.
    // The import must not be emitted, or the scaffolded app fails tsc with
    // TS6133 'Theme is declared but its value is never read'.
    const themePkg = registryPackages.find((p) => p.name === '@molecule/app-theme-css-variables')
    expect(themePkg).toBeDefined()

    const content = await generateBondSetupCode(
      themePkg!,
      'app-theme-css-variables',
      '@molecule/app-theme',
      tempDir,
    )

    expect(content).toContain('themeProvider')
    expect(content).not.toContain('import type { Theme }')
  })

  it('reads the palette from the workspace theme.css, never a sibling directory', async () => {
    // `projectPath` is the app WORKSPACE (see CLAUDE.md rule 7), so its palette
    // is exactly `<workspace>/src/theme.css`. The two other candidates the
    // reader used to probe were guesses: one keyed on the USER's project name
    // inside mlcl's own `templates/apps/` (no template ships a root
    // theme.css, so it matched nothing — and would have silently adopted a
    // flagship's palette for a custom app that happened to share its name),
    // the other `<parent>/app/src/theme.css`, which for an app-only project
    // reads a SIBLING directory's palette.
    const themePkg = registryPackages.find((p) => p.name === '@molecule/app-theme-css-variables')
    expect(themePkg).toBeDefined()

    const root = join(tempDir, 'theme-sibling')
    const workspace = join(root, 'myapp')
    await mkdir(join(root, 'app', 'src'), { recursive: true })
    await mkdir(join(workspace, 'src'), { recursive: true })
    // The sibling `app/` the removed `<parent>/app/src/theme.css` candidate
    // resolved to.
    await writeFile(
      join(root, 'app', 'src', 'theme.css'),
      ':root { --mol-color-primary: #abcdef; }\n',
    )

    const withoutOwnPalette = await generateBondSetupCode(
      themePkg!,
      'app-theme-css-variables',
      '@molecule/app-theme',
      workspace,
    )
    expect(withoutOwnPalette).not.toContain('#abcdef')

    // The positive twin: the workspace's OWN palette is the one applied.
    await writeFile(
      join(workspace, 'src', 'theme.css'),
      ':root { --mol-color-primary: #123456; }\n',
    )
    const withOwnPalette = await generateBondSetupCode(
      themePkg!,
      'app-theme-css-variables',
      '@molecule/app-theme',
      workspace,
    )
    expect(withOwnPalette).toContain("primary: '#123456'")
    expect(withOwnPalette).not.toContain('#abcdef')
  })

  it('emits the deferred-attach stub for realtime bonds (bondSetup.generatorType=realtime-deferred)', async () => {
    // Zero-config createProvider() binds nothing and silently waits for an
    // attach that only happens when the scaffolded server calls
    // attachHttpServer — the registry marks the realtime bonds
    // realtime-deferred so the stub defers explicitly and server.ts.tpl
    // attaches the bonded provider to the API's HTTP server. Without this,
    // a fresh scaffold's SSE/ws realtime is dead (no port bound, never
    // attached).
    const cases: Array<[string, string]> = [
      ['@molecule/api-realtime-socketio', 'realtime-socketio'],
      ['@molecule/api-realtime-sse', 'realtime-sse'],
      ['@molecule/api-realtime-ws', 'realtime-ws'],
    ]
    for (const [name, bondName] of cases) {
      const pkg = registryPackages.find((p) => p.name === name)
      expect(pkg, `${name} present in registry`).toBeDefined()

      const content = await generateBondSetupCode(pkg!, bondName, '@molecule/api-realtime', tempDir)

      expect(content).toContain("import { setProvider } from '@molecule/api-realtime'")
      expect(content).toContain('createProvider({ deferAttach: true })')
      expect(content).not.toContain('setProvider(createProvider())')
    }
  })

  it('passes the app base path to setFont for font bonds', async () => {
    // Local faces load from `<basePath>fonts/<file>`; a site served under a
    // sub-path (Vite `base`) 404s every face at `/fonts/…` unless the app
    // passes the base. Only the app knows it (import.meta.env.BASE_URL), so
    // the generated bond file passes it (X0 x17/x18: every e2e test failed the
    // console guard on the Arimo 404 under BASE_PATH=/blog).
    const pkg = registryPackages.find((p) => p.name === '@molecule/app-fonts-arimo')
    expect(pkg, '@molecule/app-fonts-arimo present in registry').toBeDefined()

    const content = await generateBondSetupCode(
      pkg!,
      'app-fonts-arimo',
      '@molecule/app-fonts',
      tempDir,
    )

    expect(content).toContain("import { setFont } from '@molecule/app-fonts'")
    expect(content).toContain('setFont(font, { basePath: import.meta.env.BASE_URL })')
    expect(content).not.toContain('setFont(font)\n')
  })

  it('does not re-export providers without appBondSetup.reExport', () => {
    // Create a plan with a bond setup that does NOT have reExport
    const customPlan: InjectionPlan = {
      molecule: '@molecule/app-custom-bond',
      moleculePackage: {
        name: '@molecule/app-custom-bond',
        version: '1.0.0',
        type: 'provider',
        routes: [],
        tables: [],
        exports: ['provider'],
        path: '/tmp/test-app',
        molecule: {
          category: 'custom',
          implements: '@molecule/app-custom',
        },
      },
      files: [],
      dependencies: [],
      migrations: [],
      bondSetup: {
        providerPackage: '@molecule/app-custom-bond',
        interfacePackage: '@molecule/app-custom',
        interfaceType: 'custom',
        setupCode: 'mock',
      },
      conflicts: [],
    }

    const files = synthesizeAppProjectFiles(
      [customPlan],
      ['@molecule/app-custom-bond'],
      '/tmp/test-app',
      registryPackages,
    )

    const bondsFile = files.find((f) => f.targetPath.endsWith('bonds/index.ts'))
    expect(bondsFile).toBeDefined()
    // Should NOT have a re-export since there's no appBondSetup.reExport
    expect(bondsFile!.content).not.toContain('export {')
  })

  it('re-exports default bond from core package appBondSetup', () => {
    // When no provider bond exists but core package has defaultBond + appBondSetup,
    // the default bond setup file and re-export should be generated.
    const plans = [makePlan('@molecule/app-auth')]
    const molecules = ['@molecule/app-auth']

    const files = synthesizeAppProjectFiles(plans, molecules, '/tmp/test-app', registryPackages)

    const bondsFile = files.find((f) => f.targetPath.endsWith('bonds/index.ts'))
    expect(bondsFile).toBeDefined()
    // @molecule/app-auth has defaultBond: 'auth-default' and appBondSetup.exportName: 'authClient'
    expect(bondsFile!.content).toContain("export { authClient } from './auth-default.js'")
  })
})

// ============================================================================
// peerDependency version pinning
// ============================================================================

describe('peerDependency pinning', () => {
  /**
   * Build a minimal plan whose only effect is writing `dependencies` into the
   * target package.json, so the assertions are about pin resolution alone.
   */
  function makeDepsPlan(dependencies: InjectionPlan['dependencies']): InjectionPlan {
    return {
      molecule: '@molecule/test',
      moleculePackage: {
        name: '@molecule/test',
        version: '1.0.0',
        dependencies: {},
        peerDependencies: {},
        type: 'utility',
        routes: [],
        tables: [],
        exports: [],
        path: '/fake',
      },
      files: [],
      dependencies,
      migrations: [],
      bondSetup: null,
      conflicts: [],
    }
  }

  it('pins a @molecule peer to its registry override, not the peer-range floor', async () => {
    // Pick a real package whose registry override differs from the lockstep
    // default, and declare the peer with a range whose floor IS that default —
    // exactly the shape the fleet ships (e.g. @molecule/app-auth peers at
    // `^1.0.1` while moleculeVersions overrides it to 1.1.0). Reading the pair
    // from the registry keeps the test honest across release waves instead of
    // hardcoding two versions that may drift into being equal.
    const { default: defaultVersion, overrides } = loadMoleculeVersions()
    const overridden = Object.entries(overrides).find(([, v]) => v !== defaultVersion)
    expect(
      overridden,
      'registry has no @molecule override differing from the default',
    ).toBeDefined()
    const [peerName, overrideVersion] = overridden!

    const projectDir = join(tempDir, 'exec-test-peer-pin-override')
    await mkdir(projectDir, { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    const plan = makeDepsPlan([
      { name: peerName, version: `^${defaultVersion}`, type: 'peerDependency' },
    ])

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(true)

    const pkg = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf-8'))
    expect(pkg.dependencies[peerName]).toBe(overrideVersion)
    expect(pkg.dependencies[peerName]).toBe(getMoleculeVersion(peerName))
    // The floor of the declared range must NOT win.
    expect(pkg.dependencies[peerName]).not.toBe(defaultVersion)
  })

  it('pins a @molecule peer with no override to the lockstep default', async () => {
    const { default: defaultVersion, overrides } = loadMoleculeVersions()
    // Prefer a real registry package with no override; since the fleet-wide
    // pin bumps every registry package carries one, so fall back to a
    // synthetic @molecule name — getMoleculeVersion takes the same default
    // fallback path for any name without an override. Earlier incarnations
    // hardcoded `@molecule/app-theme`, then searched real packages, and both
    // went red over registry data, not behaviour.
    const realName = registryPackages
      .map((entry) => entry.name)
      .find((name) => overrides[name] === undefined)
    const peerName = realName ?? '@molecule/zz-test-no-override-fixture'

    const projectDir = join(tempDir, 'exec-test-peer-pin-default')
    await mkdir(projectDir, { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    // A deliberately ancient range floor: the registry, not the range, decides.
    const plan = makeDepsPlan([{ name: peerName, version: '^0.0.1', type: 'peerDependency' }])

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(true)

    const pkg = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf-8'))
    expect(pkg.dependencies[peerName]).toBe(defaultVersion)
    expect(pkg.dependencies[peerName]).not.toBe('0.0.1')
  })

  it('keeps stripping the range for non-@molecule peers', async () => {
    const projectDir = join(tempDir, 'exec-test-peer-pin-external')
    await mkdir(projectDir, { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    const plan = makeDepsPlan([
      { name: 'react', version: '^19.2.4', type: 'peerDependency' },
      { name: 'express', version: '>=5.0.0', type: 'peerDependency' },
    ])

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(true)

    const pkg = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf-8'))
    expect(pkg.dependencies.react).toBe('19.2.4')
    expect(pkg.dependencies.express).toBe('5.0.0')
  })

  it('pins a union peer range to its lowest floor — never ships a range as the pin', async () => {
    const projectDir = join(tempDir, 'exec-test-peer-pin-union')
    await mkdir(projectDir, { recursive: true })
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'test' }))

    // The shapes the fleet actually declares (express `^4 || ^5`, vite's
    // four-way union): stripping ONE leading operator left `4.0.0 || ^5.0.0`
    // in the target's dependencies — still a range, so npm resolved it at
    // install time in a manifest that must pin exact.
    const plan = makeDepsPlan([
      { name: 'express', version: '^4.0.0 || ^5.0.0', type: 'peerDependency' },
      { name: 'vite', version: '^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0', type: 'peerDependency' },
    ])

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(true)

    const pkg = JSON.parse(await readFile(join(projectDir, 'package.json'), 'utf-8'))
    // The floor of a union is the lowest concrete version any alternative
    // admits — 4.0.0 for express, 5.0.0 for vite.
    expect(pkg.dependencies.express).toBe('4.0.0')
    expect(pkg.dependencies.vite).toBe('5.0.0')
    // Whatever the shape, the pin is a bare exact version — no operator, no `||`.
    for (const pin of [pkg.dependencies.express, pkg.dependencies.vite]) {
      expect(pin).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  it('refuses a non-@molecule peer whose range has no concrete floor — no range is shipped', async () => {
    const projectDir = join(tempDir, 'exec-test-peer-pin-unpinnable')
    await mkdir(projectDir, { recursive: true })
    const original = JSON.stringify({ name: 'test', dependencies: {} }, null, 2) + '\n'
    await writeFile(join(projectDir, 'package.json'), original)

    const plan = makeDepsPlan([{ name: 'left-pad', version: '*', type: 'peerDependency' }])

    const result = await executeInjection(plan, projectDir, { autoInstall: false })
    expect(result.success).toBe(false)
    expect(result.errors.join('\n')).toContain('no concrete version floor')
    // The refusal rolls back: the manifest is the pre-injection bytes — an
    // unpinnable peer never lands as a range.
    expect(await readFile(join(projectDir, 'package.json'), 'utf-8')).toBe(original)
  })
})
