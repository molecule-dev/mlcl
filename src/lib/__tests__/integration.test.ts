/**
 * End-to-end integration test for the inject pipeline.
 *
 * Creates a self-contained temp project with symlinks, then:
 * 1. Plans injection for all molecules
 * 2. Synthesizes holistic project files (router, server, bonds, wrappers)
 * 3. Writes synthesized files to disk
 * 4. Validates the output
 * 5. Checks expected route coverage
 *
 * @module
 */

import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type InjectionPlan, planInjection, synthesizeProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'
import { validateInjectionOutput } from '../validator.js'
import { createTestProject, TEST_MOLECULES } from './create-test-project.js'

// ---------------------------------------------------------------------------
// Shared state — compute once, assert many times
// ---------------------------------------------------------------------------

let testProject: string
let plans: InjectionPlan[]
let synthesizedFiles: Awaited<ReturnType<typeof synthesizeProjectFiles>>

beforeAll(async () => {
  // Create a self-contained test project with symlinks
  testProject = await createTestProject()

  // Plan injection for all molecules
  plans = await Promise.all(TEST_MOLECULES.map((m) => planInjection(m, testProject)))

  // Synthesize holistic project files
  const registryPackages = loadRegistry()
  synthesizedFiles = await synthesizeProjectFiles(
    plans,
    TEST_MOLECULES,
    testProject,
    registryPackages,
  )

  // Write per-plan files to disk (bond setups, middleware files)
  for (const plan of plans) {
    for (const file of plan.files) {
      if (file.content && file.action === 'create') {
        await mkdir(dirname(file.targetPath), { recursive: true })
        await writeFile(file.targetPath, file.content)
      }
    }
  }

  // Write synthesized holistic files to disk (router, server, bonds/index, wrappers)
  for (const file of synthesizedFiles) {
    if (file.content) {
      await mkdir(dirname(file.targetPath), { recursive: true })
      await writeFile(file.targetPath, file.content)
    }
  }
})

afterAll(async () => {
  await rm(testProject, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// 1. Injection Planning
// ---------------------------------------------------------------------------

describe('injection planning (full molecule set)', () => {
  it('plans injection for all molecules without errors', () => {
    expect(plans).toHaveLength(TEST_MOLECULES.length)
    plans.forEach((plan) => {
      expect(plan.molecule).toBeTruthy()
      expect(plan.moleculePackage).toBeDefined()
    })
  })

  it('identifies resource packages correctly', () => {
    const resources = plans.filter((p) => p.moleculePackage?.type === 'resource')
    const names = resources.map((r) => r.molecule).sort()
    expect(names).toContain('@molecule/api-resource-user')
    expect(names).toContain('@molecule/api-resource-device')
    expect(names).toContain('@molecule/api-resource-payment')
  })

  it('identifies bond packages correctly', () => {
    const bonds = plans.filter((p) => p.bondSetup !== null)
    const names = bonds.map((b) => b.molecule).sort()
    expect(names).toContain('@molecule/api-oauth-github')
    expect(names).toContain('@molecule/api-payments-stripe')
    expect(names).toContain('@molecule/api-database-postgresql')
    expect(names).toContain('@molecule/api-emails-mailgun')
  })

  it('detects SQL tables for resource packages', () => {
    const userPlan = plans.find((p) => p.molecule === '@molecule/api-resource-user')!
    expect(userPlan.moleculePackage.tables.length).toBeGreaterThan(0)

    const devicePlan = plans.find((p) => p.molecule === '@molecule/api-resource-device')!
    expect(devicePlan.moleculePackage.tables.length).toBeGreaterThan(0)
  })

  it('collects all peer dependencies', () => {
    const allDeps = plans.flatMap((p) => p.dependencies.map((d) => d.name))
    expect(allDeps).toContain('@molecule/api-resource-user')
    expect(allDeps).toContain('@molecule/api-database-postgresql')
  })
})

// ---------------------------------------------------------------------------
// 2. File Synthesis
// ---------------------------------------------------------------------------

describe('file synthesis (full molecule set)', () => {
  it('synthesizes router.ts', () => {
    const routerFile = synthesizedFiles.find((f) => f.targetPath.endsWith('router.ts'))
    expect(routerFile).toBeDefined()
    expect(routerFile!.content).toContain("import { Router } from 'express'")
    expect(routerFile!.content).toContain('export const router')
  })

  it('router has all expected User routes', () => {
    const routerFile = synthesizedFiles.find((f) => f.targetPath.endsWith('router.ts'))!
    const content = routerFile.content!

    expect(content).toContain('/users')
    expect(content).toContain('/users/log-in')
    expect(content).toContain('/users/log-in/oauth')
    expect(content).toContain('verify-payment/:provider')
  })

  it('router has Device routes', () => {
    const routerFile = synthesizedFiles.find((f) => f.targetPath.endsWith('router.ts'))!
    const content = routerFile.content!

    expect(content).toContain('/devices')
    expect(content).toContain('/devices/:id')
  })

  it('router does not import resources with no active routes', () => {
    const routerFile = synthesizedFiles.find((f) => f.targetPath.endsWith('router.ts'))!
    const content = routerFile.content!

    expect(content).not.toContain("from './Resource/Payment")
  })

  it('synthesizes server.ts with setupBonds', () => {
    const serverFile = synthesizedFiles.find((f) => f.targetPath.endsWith('server.ts'))
    expect(serverFile).toBeDefined()
    expect(serverFile!.content).toContain('setupBonds')
    expect(serverFile!.content).toContain("import express from 'express'")
  })

  it('server.ts includes all installed middleware', () => {
    const serverFile = synthesizedFiles.find((f) => f.targetPath.endsWith('server.ts'))!
    const content = serverFile.content!

    expect(content).toContain('cors')
    expect(content).toContain('bodyParser')
    expect(content).toContain('cookieParser')
  })

  it('synthesizes bonds/index.ts with setupBonds function', () => {
    const bondsFile = synthesizedFiles.find((f) => f.targetPath.endsWith('bonds/index.ts'))
    expect(bondsFile).toBeDefined()
    expect(bondsFile!.content).toContain('setupBonds')
  })

  it('bonds/index.ts imports all bond setup files', () => {
    const bondsFile = synthesizedFiles.find((f) => f.targetPath.endsWith('bonds/index.ts'))!
    const content = bondsFile.content!

    expect(content).toContain('database-postgresql')
    expect(content).toContain('emails-mailgun')
    expect(content).toContain('oauth-github')
    expect(content).toContain('payments-stripe')
    expect(content).toContain('service-device')
    expect(content).toContain('service-payment')
  })

  it('synthesizes User resource wrapper', () => {
    const userWrapper = synthesizedFiles.find((f) =>
      f.targetPath.includes('Resource/User/index.ts'),
    )
    expect(userWrapper).toBeDefined()
    expect(userWrapper!.content).toContain('createRequestHandlerMap')
    expect(userWrapper!.content).toContain('createRequestHandler')
    expect(userWrapper!.content).toContain('authorization')
  })

  it('synthesizes Device resource wrapper', () => {
    const deviceWrapper = synthesizedFiles.find((f) =>
      f.targetPath.includes('Resource/Device/index.ts'),
    )
    expect(deviceWrapper).toBeDefined()
    expect(deviceWrapper!.content).toContain('createRequestHandlerMap')
    expect(deviceWrapper!.content).toContain('createRequestHandler')
  })

  it('synthesizes service bond files', () => {
    const serviceBonds = synthesizedFiles.filter((f) => f.targetPath.includes('bonds/service-'))
    expect(serviceBonds.length).toBeGreaterThanOrEqual(2)

    const names = serviceBonds.map((f) => f.targetPath)
    expect(names.some((n) => n.includes('service-device'))).toBe(true)
    expect(names.some((n) => n.includes('service-payment'))).toBe(true)
  })

  it('synthesizes smoke tests', () => {
    const serverTest = synthesizedFiles.find((f) =>
      f.targetPath.includes('__tests__/server.test.ts'),
    )
    expect(serverTest).toBeDefined()
    expect(serverTest!.content).toContain('import')

    const routeTest = synthesizedFiles.find((f) =>
      f.targetPath.includes('__tests__/routes.test.ts'),
    )
    expect(routeTest).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 3. Validation (synthesized files written to disk)
// ---------------------------------------------------------------------------

describe('validation of synthesized output', () => {
  it('passes validation', async () => {
    const result = await validateInjectionOutput(testProject)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('has all expected bond setup files', async () => {
    const bondsDir = join(testProject, 'src', 'bonds')
    const files = await readdir(bondsDir)

    expect(files).toContain('index.ts')
    expect(files).toContain('database-postgresql.ts')
    expect(files).toContain('emails-mailgun.ts')
    expect(files).toContain('oauth-github.ts')
    expect(files).toContain('payments-stripe.ts')
    expect(files).toContain('service-device.ts')
    expect(files).toContain('service-payment.ts')
  })

  it('has all expected resource wrappers', async () => {
    const resourceDir = join(testProject, 'src', 'App', 'Resource')
    const dirs = await readdir(resourceDir)

    expect(dirs).toContain('User')
    expect(dirs).toContain('Device')
  })
})

// ---------------------------------------------------------------------------
// 4. Expected route coverage
// ---------------------------------------------------------------------------

describe('expected route coverage', () => {
  const EXPECTED_ROUTES = [
    // User routes
    { method: 'post', path: '/users' },
    { method: 'post', path: '/users/log-in' },
    // OAuth — BOTH halves of the flow: GET initiation (state + PKCE cookies
    // → 302 to the provider's authorize URL) and the POST callback exchange.
    // The initiation route was the missing piece that left generated apps
    // with an exchange endpoint but no way to start the dance.
    { method: 'get', path: '/users/oauth/:provider' },
    { method: 'post', path: '/users/log-in/oauth' },
    // Logout + session restore ([M1-1]) — present in the declarative route
    // table all along but silently dropped from generated routers while the
    // registry's stale routes copy shadowed routes.ts.
    { method: 'post', path: '/users/logout' },
    { method: 'post', path: '/users/forgot-password' },
    { method: 'post', path: '/users/reset-password' },
    { method: 'get', path: '/users/me' },
    { method: 'get', path: '/users/:id' },
    { method: 'patch', path: '/users/:id' },
    { method: 'delete', path: '/users/:id' },
    { method: 'patch', path: '/users/:id/password' },
    { method: 'post', path: '/users/:id/verify-two-factor' },
    { method: 'patch', path: '/users/:id/plan' },
    // Payment routes (generic, provider-parameterized)
    { method: 'get', path: '/users/:id/verify-payment/:provider' },
    { method: 'post', path: '/users/:id/verify-payment/:provider' },
    // Billing portal + the push public key were added to routes.ts after the
    // registry's routes copy was written and never reached it — the same
    // shadowing as [M1-1] above, caught once `sync-registry --scan-routes`
    // started deriving the registry copy from source.
    { method: 'post', path: '/users/:id/billing-portal/:provider' },
    { method: 'post', path: '/users/payment-notification/:provider' },
    // Device routes
    { method: 'get', path: '/devices/push/public-key' },
    { method: 'get', path: '/devices' },
    { method: 'get', path: '/devices/:id' },
    { method: 'patch', path: '/devices/:id' },
    { method: 'delete', path: '/devices/:id' },
  ]

  it('synthesized router has all expected routes', () => {
    const routerFile = synthesizedFiles.find((f) => f.targetPath.endsWith('router.ts'))!
    const content = routerFile.content!

    for (const route of EXPECTED_ROUTES) {
      const pattern = `router.${route.method}(\`${route.path}\``
      expect(content).toContain(pattern)
    }
  })

  it('synthesized router has exactly the expected number of routes', () => {
    const routerFile = synthesizedFiles.find((f) => f.targetPath.endsWith('router.ts'))!
    const routeCount = (routerFile.content!.match(/router\.(get|post|patch|put|delete)\(/g) || [])
      .length

    expect(routeCount).toBe(EXPECTED_ROUTES.length)
  })
})

// ---------------------------------------------------------------------------
// 5. Structure checks
// ---------------------------------------------------------------------------

describe('structure checks', () => {
  it('tsconfig.json exists', async () => {
    await expect(access(join(testProject, 'tsconfig.json'))).resolves.toBeUndefined()
  })

  it('synthesized server.ts is valid TypeScript (basic structure check)', () => {
    const serverFile = synthesizedFiles.find((f) => f.targetPath.endsWith('server.ts'))!
    const content = serverFile.content!

    expect(content).toMatch(/^import\s/m)
    expect(content).toMatch(/app\.listen|export/)
    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length
    expect(openBraces).toBe(closeBraces)
  })

  it('synthesized router.ts has balanced braces and brackets', () => {
    const routerFile = synthesizedFiles.find((f) => f.targetPath.endsWith('router.ts'))!
    const content = routerFile.content!

    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length
    expect(openBraces).toBe(closeBraces)

    const openBrackets = (content.match(/\[/g) || []).length
    const closeBrackets = (content.match(/\]/g) || []).length
    expect(openBrackets).toBe(closeBrackets)
  })
})
