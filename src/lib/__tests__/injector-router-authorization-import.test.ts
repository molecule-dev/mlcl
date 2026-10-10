/**
 * `router.ts` is generated from registry metadata, and the resources that
 * export `authorization` are wired into it TWICE: their accessor is imported
 * (`import { authorization as xAuthorization } from './Resource/X/index.js'`)
 * and the app-wide gate is emitted
 * (`router.use(xAuthorization.verifyMiddleware())`).
 *
 * The import loop skipped resources with no ACTIVE routes (the "avoid unused
 * imports" rule); the `router.use` loop did not. A resource whose routes are all
 * optional and whose feature flag is absent therefore produced a router calling
 * an identifier nothing had imported — a scaffolded project that cannot compile
 * (TS2304) — and the wrapper that import needs was skipped for the same reason
 * (TS2307 if it were imported). Today's registry has one `authorization`
 * exporter (@molecule/api-resource-user) with 18 required routes, so the path
 * was latent; the generated code has to agree with itself before it is reached.
 *
 * Everything here is the shipped `synthesizeProjectFiles` with a synthetic plan;
 * only the plan data is ours.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { InjectionPlan } from '../injector.js'
import { synthesizeProjectFiles } from '../injector.js'
import type { InferredRoute } from '../schema.js'

const RESOURCE = '@molecule/api-resource-fixture'

let projectPath: string

beforeAll(async () => {
  projectPath = await mkdtemp(join(tmpdir(), 'mlcl-router-authz-'))
})

afterAll(async () => {
  // The generator only builds FileOperations; nothing is written into the dir.
  await rm(projectPath, { recursive: true, force: true })
})

/** A resource plan exporting `authorization`, with the routes given. */
function resourcePlan(routes: InferredRoute[]): InjectionPlan {
  return {
    molecule: RESOURCE,
    moleculePackage: {
      name: RESOURCE,
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'resource',
      routes,
      tables: [],
      exports: [
        'authorization',
        'authorizers',
        'handlers',
        'createRequestHandlerMap',
        'requestHandlerMap',
      ],
      path: '/fake',
    },
    files: [],
    dependencies: [],
    routeWiring: [],
    migrations: [],
    bondSetup: null,
    conflicts: [],
  }
}

/** The generated router.ts content from one synthesis pass. */
async function routerFor(routes: InferredRoute[]): Promise<{ router: string; files: string[] }> {
  const files = await synthesizeProjectFiles(
    [resourcePlan(routes)],
    [RESOURCE],
    projectPath,
    undefined,
    'express',
  )
  const router = files.find((f) => f.targetPath.endsWith(join('App', 'router.ts')))
  expect(router, 'the synthesis must emit src/App/router.ts').toBeDefined()
  return {
    router: String(router?.content),
    files: files.map((f) => f.targetPath),
  }
}

const optionalRoute = {
  method: 'get',
  path: '/fixture',
  handler: 'listFixture',
  middlewares: [],
  optional: 'payments',
}

describe('generated router.ts — an authorization resource is imported when its gate is emitted', () => {
  it('imports the accessor (and the wrapper) for a gate it emits with no active routes', async () => {
    // No registry metadata for the optional feature → the route is inactive, so
    // the resource has no active routes at all.
    const { router, files } = await routerFor([optionalRoute])

    // The gate is emitted…
    expect(router).toContain('router.use(fixtureAuthorization.verifyMiddleware())')
    // …and the identifier it names is imported from a wrapper that exists.
    expect(router).toContain(
      "import { authorization as fixtureAuthorization } from './Resource/Fixture/index.js'",
    )
    expect(files.some((p) => p.endsWith(join('Resource', 'Fixture', 'index.ts')))).toBe(true)
    // The handler map is NOT imported: nothing uses it (an unused import fails
    // the scaffolded project's own type-check).
    expect(router).not.toContain('import { requestHandlerMap as Fixture }')
    // …and no route line is emitted for the inactive route.
    expect(router).not.toContain('router.get(`/fixture`')
  })

  it('still imports both accessors and wires the routes for an active-route resource', async () => {
    const activeRoute = { ...optionalRoute, optional: undefined }
    const { router, files } = await routerFor([activeRoute])

    expect(router).toContain(
      "import { authorization as fixtureAuthorization } from './Resource/Fixture/index.js'",
    )
    expect(router).toContain(
      "import { requestHandlerMap as Fixture } from './Resource/Fixture/index.js'",
    )
    expect(router).toContain('router.use(fixtureAuthorization.verifyMiddleware())')
    expect(router).toContain('router.get(`/fixture`')
    expect(router).toContain('Fixture.listFixture')
    expect(files.some((p) => p.endsWith(join('Resource', 'Fixture', 'index.ts')))).toBe(true)
  })
})
