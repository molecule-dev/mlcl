import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the owner via ADMIN_EMAILS, read at module
// evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'owner@coupons.com'

// ---- Mock the molecule data layer the handlers + middleware touch ----------
// users: drives requireAdmin's role lookup; categories: drives the
// fetch-and-404 existence check in PUT/DELETE; deals count gates DELETE.
const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'someone@example.com', role: 'admin' }
    if (id === 'owner-1') return { id, email: 'Owner@Coupons.com', role: 'user' }
    if (id === 'user-1') return { id, email: 'customer@example.com', role: 'user' }
    return null
  }
  // Any category row "exists" so the PUT/DELETE 404 guard passes for admins.
  return { id }
})
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const create = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [])
// No active deals → the DELETE guard allows deletion for the admin-success path.
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

let server: Server
let baseUrl: string

beforeAll(async () => {
  const categories = (await import('../handlers/categories.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real JWT auth middleware would populate it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/categories', categories)

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
    body: JSON.stringify({ name: 'Electronics', slug: 'electronics', sort_order: 0 }),
  })

// Every shared-catalog write route. The categories table is a global taxonomy
// with no per-user owner, so all three writes must be admin-gated (broken
// access-control finding: "Real admin RBAC would gate this further").
const writeRoutes: Array<{ name: string; method: Method; path: string }> = [
  { name: 'POST /categories', method: 'POST', path: '/categories' },
  {
    name: 'PUT /categories/:id',
    method: 'PUT',
    path: '/categories/00000000-0000-0000-0000-000000000001',
  },
  {
    name: 'DELETE /categories/:id',
    method: 'DELETE',
    path: '/categories/00000000-0000-0000-0000-000000000001',
  },
]

describe('category write routes are admin-gated (broken access control)', () => {
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
      // The write never happened — the global catalog stays intact.
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
