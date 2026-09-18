import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the owner via ADMIN_EMAILS, read at module
// evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'owner@price-comparison.app'

// ---- Mock the molecule data layer the handlers + middleware touch ----------
// users: drives requireAdmin's role lookup; catalog tables: drive the
// fetch-and-404 existence checks in PUT/DELETE/POST handlers.
const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'someone@example.com', role: 'admin' }
    if (id === 'owner-1') return { id, email: 'Owner@Price-Comparison.App', role: 'user' }
    if (id === 'user-1') return { id, email: 'customer@example.com', role: 'user' }
    return null
  }
  // Any catalog row "exists" so the PUT/DELETE/fetch 404 guard passes for admins.
  return { id }
})
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const create = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [])
const count = vi.fn(async (..._a: unknown[]) => 0)

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  updateById: (...a: unknown[]) => updateById(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  create: (...a: unknown[]) => create(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  count: (...a: unknown[]) => count(...a),
}))

// getUserId reads res.locals.session?.userId — replicate that real behaviour;
// getParamId reads req.params.id.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

// Validation is orthogonal to the authz fix — pass bodies through untouched so
// the admin-success path reaches the handler regardless of body shape.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Cache, search, http, cron — orthogonal infra; stub so the admin-success path
// reaches a terminal response without touching Redis/Meilisearch/network/cron.
vi.mock('@molecule/api-cache', () => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-search', () => ({
  index: vi.fn(async () => undefined),
  search: vi.fn(async () => ({ results: [] })),
  deleteDocument: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-http', () => ({
  get: vi.fn(async () => ({ data: [] })),
}))

vi.mock('@molecule/api-cron', () => ({
  schedule: vi.fn(async () => undefined),
}))

// Email + entitlements — touched only inside the cron callback / owner-scoped
// alert routes; stub so the admin-gate path on POST /alerts/cron/init reaches a
// terminal response without sending mail or enforcing tier limits.
vi.mock('@molecule/api-emails', () => ({
  sendMail: vi.fn(async () => ({ id: 'mail-1' })),
}))

vi.mock('@molecule/api-entitlements', () => ({
  // enforceLimit(config) returns an Express middleware — pass through.
  enforceLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const products = (await import('../handlers/products.js')).default
  const sources = (await import('../handlers/sources.js')).default
  const prices = (await import('../handlers/prices.js')).default
  const alerts = (await import('../handlers/alerts.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real JWT auth middleware would populate it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/products', products)
  app.use('/sources', sources)
  app.use('/prices', prices)
  app.use('/alerts', alerts)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
})

type Method = 'POST' | 'PUT' | 'DELETE'

const call = (method: Method, path: string, user?: string) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(user ? { 'x-test-user': user } : {}),
    },
    body: JSON.stringify({
      name: 'n',
      slug: 's',
      baseUrl: 'https://example.com',
      productId: '00000000-0000-0000-0000-000000000002',
      sourceId: '00000000-0000-0000-0000-000000000003',
      price: 1000,
    }),
  })

// Every shared-catalog/config write route (no per-user owner column). Catalog
// creation/defacement/deletion, arbitrary price writes, source fetches, and
// cron installation all flow through these (broken-access-control finding).
const ID = '00000000-0000-0000-0000-000000000001'
const writeRoutes: Array<{ name: string; method: Method; path: string }> = [
  { name: 'POST /products/seed', method: 'POST', path: '/products/seed' },
  { name: 'POST /products', method: 'POST', path: '/products' },
  { name: 'PUT /products/:id', method: 'PUT', path: `/products/${ID}` },
  { name: 'DELETE /products/:id', method: 'DELETE', path: `/products/${ID}` },
  { name: 'POST /sources', method: 'POST', path: '/sources' },
  { name: 'PUT /sources/:id', method: 'PUT', path: `/sources/${ID}` },
  { name: 'DELETE /sources/:id', method: 'DELETE', path: `/sources/${ID}` },
  { name: 'POST /sources/:id/fetch', method: 'POST', path: `/sources/${ID}/fetch` },
  { name: 'POST /sources/cron/init', method: 'POST', path: '/sources/cron/init' },
  { name: 'POST /prices', method: 'POST', path: '/prices' },
  { name: 'POST /alerts/cron/init', method: 'POST', path: '/alerts/cron/init' },
]

describe('global-catalog write routes are admin-gated (broken-access-control fix)', () => {
  for (const route of writeRoutes) {
    it(`${route.name} → 401 with no session`, async () => {
      const res = await call(route.method, route.path)
      expect(res.status).toBe(401)
      expect(create).not.toHaveBeenCalled()
      expect(updateById).not.toHaveBeenCalled()
      expect(deleteById).not.toHaveBeenCalled()
    })

    it(`${route.name} → 403 for an ordinary authenticated (non-admin) user`, async () => {
      const res = await call(route.method, route.path, 'user-1')
      expect(res.status).toBe(403)
      // The write never happened — catalog/config stays intact.
      expect(create).not.toHaveBeenCalled()
      expect(updateById).not.toHaveBeenCalled()
      expect(deleteById).not.toHaveBeenCalled()
    })

    it(`${route.name} → succeeds for an admin user`, async () => {
      const res = await call(route.method, route.path, 'admin-1')
      expect([200, 201, 204]).toContain(res.status)
    })

    it(`${route.name} → succeeds for an ADMIN_EMAILS owner (lazy promotion)`, async () => {
      const res = await call(route.method, route.path, 'owner-1')
      expect([200, 201, 204]).toContain(res.status)
      // Owner is durably promoted to role='admin' on first write.
      expect(updateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
    })
  }
})
