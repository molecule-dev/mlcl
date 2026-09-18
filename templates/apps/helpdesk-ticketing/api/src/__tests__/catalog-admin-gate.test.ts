import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the operator via ADMIN_EMAILS, read at module
// evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'owner@helpdesk.com'

// ---- Mock the molecule data layer the handlers + middleware touch ----------
// users: drives requireAdmin's role lookup; catalog/config tables: drive the
// fetch-and-404 existence checks in PATCH/DELETE.
const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'someone@example.com', role: 'admin' }
    if (id === 'owner-1') return { id, email: 'Owner@Helpdesk.com', role: 'user' }
    if (id === 'user-1') return { id, email: 'customer@example.com', role: 'user' }
    return null
  }
  // Any catalog row "exists" so the PATCH/DELETE 404 guard passes for admins.
  return { id }
})
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const create = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [])

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  updateById: (...a: unknown[]) => updateById(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  create: (...a: unknown[]) => create(...a),
  findMany: (...a: unknown[]) => findMany(...a),
}))

// getUserId reads res.locals.session?.userId — replicate that real behaviour.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))

// Validation is orthogonal to the authz fix — pass bodies/queries through
// untouched so the admin-success path reaches the handler regardless of body.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

// Tier-limit enforcement (maxKbArticles / maxMacros) is orthogonal to the admin-gate
// fix — pass through so the admin-success path reaches the handler.
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
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
  const sla = (await import('../handlers/sla.js')).default
  const articles = (await import('../handlers/articles.js')).default
  const macros = (await import('../handlers/macros.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real JWT auth middleware would populate it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/sla', sla)
  app.use('/articles', articles)
  app.use('/macros', macros)

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

type Method = 'POST' | 'PATCH' | 'DELETE'

const call = (method: Method, path: string, user?: string) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(user ? { 'x-test-user': user } : {}),
    },
    body: JSON.stringify({
      name: 'n',
      title: 't',
      body: 'b',
      first_response_hours: 1,
      resolution_hours: 2,
      actions: [],
    }),
  })

const id = '00000000-0000-0000-0000-000000000001'

// Every owner-less shared-catalog/config WRITE route. SLA targets, KB content
// and macro automations all flow through these — none has a per-user owner
// column, so an authenticated-but-non-operator user must be blocked.
const writeRoutes: Array<{ name: string; method: Method; path: string }> = [
  { name: 'POST /sla', method: 'POST', path: '/sla' },
  { name: 'PATCH /sla/:id', method: 'PATCH', path: `/sla/${id}` },
  { name: 'DELETE /sla/:id', method: 'DELETE', path: `/sla/${id}` },
  { name: 'POST /articles', method: 'POST', path: '/articles' },
  { name: 'PATCH /articles/:id', method: 'PATCH', path: `/articles/${id}` },
  { name: 'DELETE /articles/:id', method: 'DELETE', path: `/articles/${id}` },
  { name: 'POST /macros', method: 'POST', path: '/macros' },
  { name: 'PATCH /macros/:id', method: 'PATCH', path: `/macros/${id}` },
  { name: 'DELETE /macros/:id', method: 'DELETE', path: `/macros/${id}` },
]

describe('helpdesk catalog/config write routes are admin-gated', () => {
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
      // The write never happened — the shared config/catalog stays intact.
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
