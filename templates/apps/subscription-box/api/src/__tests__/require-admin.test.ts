import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the service owner via ADMIN_EMAILS, read at module
// evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'owner@box.com'

// ---- Mock the molecule data layer the handlers + middleware touch ----------
// users: drives requireAdmin's role lookup; subscription_plans: drives the
// PUT fetch-and-404 existence check via updateById's returned data.
const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'someone@example.com', role: 'admin' }
    if (id === 'owner-1') return { id, email: 'Owner@Box.com', role: 'customer' }
    if (id === 'user-1') return { id, email: 'customer@example.com', role: 'customer' }
    return null
  }
  return { id }
})
const updateById = vi.fn(async (table: string, ..._a: unknown[]) =>
  table === 'users' ? { data: { ok: true } } : { data: { id: 'plan-1' } },
)
const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'plan-1' } }))
const findMany = vi.fn(async (..._a: unknown[]) => [])

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  updateById: (...a: unknown[]) => updateById(a[0] as string, ...a.slice(1)),
  create: (...a: unknown[]) => create(...a),
  findMany: (...a: unknown[]) => findMany(...a),
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

// The shipments router additionally touches the auth + email bonds. Neither is
// exercised on the admin-write paths under test (the box mock has no user_id, so
// no recipient is resolved), but the imports must resolve and stay inert.
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: (res: Response) => (res.locals.session as { userId?: string } | undefined)?.userId,
}))

const sendMail = vi.fn(async (..._a: unknown[]) => ({ id: 'mail-1' }))
vi.mock('@molecule/api-emails', () => ({
  sendMail: (...a: unknown[]) => sendMail(...a),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const plans = (await import('../handlers/plans.js')).default
  const shipments = (await import('../handlers/shipments.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real JWT auth middleware would populate it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/plans', plans)
  app.use('/shipments', shipments)

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

type Method = 'POST' | 'PUT'

const call = (method: Method, path: string, user?: string) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(user ? { 'x-test-user': user } : {}),
    },
    body: JSON.stringify({ name: 'Pro', price: 25, features: ['a'] }),
  })

// Every shared subscription_plans catalog WRITE route. Per-user
// subscriptions/boxes reads are owner-scoped, but fulfillment WRITES (creating a
// shipment, mutating its status — they forge 'your box shipped' state/emails for
// arbitrary boxes) are operator actions and ARE admin-gated too (see below).
const writeRoutes: Array<{ name: string; method: Method; path: string }> = [
  { name: 'POST /plans', method: 'POST', path: '/plans' },
  { name: 'PUT /plans/:id', method: 'PUT', path: '/plans/00000000-0000-0000-0000-000000000001' },
]

describe('subscription_plans write routes are admin-gated (broken-access-control fix)', () => {
  for (const route of writeRoutes) {
    it(`${route.name} → 401 with no session`, async () => {
      const res = await call(route.method, route.path)
      expect(res.status).toBe(401)
      expect(create).not.toHaveBeenCalled()
      expect(updateById).not.toHaveBeenCalled()
    })

    it(`${route.name} → 403 for an ordinary authenticated (non-admin) user`, async () => {
      const res = await call(route.method, route.path, 'user-1')
      expect(res.status).toBe(403)
      // The catalog write never happened.
      expect(create).not.toHaveBeenCalled()
      expect(updateById).not.toHaveBeenCalled()
    })

    it(`${route.name} → succeeds for an admin user`, async () => {
      const res = await call(route.method, route.path, 'admin-1')
      expect([200, 201]).toContain(res.status)
    })

    it(`${route.name} → succeeds for an ADMIN_EMAILS owner (lazy promotion)`, async () => {
      const res = await call(route.method, route.path, 'owner-1')
      expect([200, 201]).toContain(res.status)
      // Owner is durably promoted to role='admin' on first write.
      expect(updateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
    })
  }
})

// Fulfillment writes (creating a shipment + advancing its status) were reachable
// by ANY authenticated user via a local fail-open requireAdmin — letting anyone
// forge fulfillment state + spoofed 'your box shipped' emails for arbitrary
// boxes. They now share the DB-backed require-admin gate.
const shipmentWriteRoutes: Array<{ name: string; method: Method; path: string }> = [
  { name: 'POST /shipments', method: 'POST', path: '/shipments' },
  {
    name: 'PUT /shipments/:id/status',
    method: 'PUT',
    path: '/shipments/00000000-0000-0000-0000-000000000001/status',
  },
]

describe('shipment fulfillment write routes are admin-gated (broken-access-control fix)', () => {
  for (const route of shipmentWriteRoutes) {
    it(`${route.name} → 401 with no session`, async () => {
      const res = await call(route.method, route.path)
      expect(res.status).toBe(401)
      // No fulfillment row was created/mutated and no shipped-email path ran.
      expect(create).not.toHaveBeenCalled()
      expect(updateById).not.toHaveBeenCalled()
      expect(sendMail).not.toHaveBeenCalled()
    })

    it(`${route.name} → 403 for an ordinary authenticated (non-admin) user`, async () => {
      const res = await call(route.method, route.path, 'user-1')
      expect(res.status).toBe(403)
      expect(create).not.toHaveBeenCalled()
      expect(updateById).not.toHaveBeenCalled()
      expect(sendMail).not.toHaveBeenCalled()
    })

    it(`${route.name} → succeeds for an admin user`, async () => {
      const res = await call(route.method, route.path, 'admin-1')
      expect([200, 201]).toContain(res.status)
    })
  }
})
