import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// requireAdmin designates the editor via ADMIN_EMAILS, read at module
// evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'editor@news.app'

// ---- Mock the molecule data layer the handlers + middleware touch ----------
// users: drives requireAdmin's role lookup; articles: drives the summarize
// fetch-and-404 existence check so the admin-success path reaches the write.
const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'someone@example.com', role: 'admin' }
    if (id === 'editor-1') return { id, email: 'Editor@News.App', role: 'user' }
    if (id === 'user-1') return { id, email: 'reader@example.com', role: 'user' }
    return null
  }
  if (table === 'articles') {
    return { id, content: 'Some article body that is long enough to summarize.' }
  }
  return { id }
})
const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'cat-1' } }))
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findOne = vi.fn(async (..._a: unknown[]) => null)
const findMany = vi.fn(async (..._a: unknown[]) => [])

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  create: (...a: unknown[]) => create(...a),
  updateById: (...a: unknown[]) => updateById(...a),
  findOne: (...a: unknown[]) => findOne(...a),
  findMany: (...a: unknown[]) => findMany(...a),
}))

// getUserId reads res.locals.session?.userId — replicate that real behaviour
// (used by the OWNER-scoped routes; requireAdmin reads res.locals directly).
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))

// Validation is orthogonal to the authz fix — pass through untouched so the
// admin-success path reaches the handler regardless of body/param shape.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-search', () => ({
  search: vi.fn(async () => ({ results: [] })),
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
  const articles = (await import('../handlers/articles.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real session middleware would populate it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/categories', categories)
  app.use('/articles', articles)

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

const call = (path: string, user?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(user ? { 'x-test-user': user } : {}),
    },
    body: JSON.stringify({ name: 'World News' }),
  })

// Every GLOBAL, owner-less catalog/config write route gated by requireAdmin.
const gatedRoutes: Array<{ name: string; path: string }> = [
  { name: 'POST /categories', path: '/categories' },
  {
    name: 'POST /articles/:id/summarize',
    path: '/articles/00000000-0000-0000-0000-000000000001/summarize',
  },
]

describe('shared-catalog admin gate (broken-access-control fix)', () => {
  for (const route of gatedRoutes) {
    describe(route.name, () => {
      it('returns 401 with no authenticated session', async () => {
        const res = await call(route.path)
        expect(res.status).toBe(401)
        expect(create).not.toHaveBeenCalled()
        expect(updateById).not.toHaveBeenCalled()
      })

      it('returns 403 for an authenticated non-admin reader', async () => {
        const res = await call(route.path, 'user-1')
        expect(res.status).toBe(403)
        // The write must never have run for a non-admin.
        expect(create).not.toHaveBeenCalled()
        expect(updateById).not.toHaveBeenCalled()
      })

      it('succeeds for a user whose role is already admin', async () => {
        const res = await call(route.path, 'admin-1')
        expect(res.status).toBeLessThan(300)
        expect(res.status).toBeGreaterThanOrEqual(200)
      })

      it('succeeds + promotes a user on the ADMIN_EMAILS allow-list', async () => {
        const res = await call(route.path, 'editor-1')
        expect(res.status).toBeLessThan(300)
        // requireAdmin lazily persists the role promotion for the editor.
        expect(updateById).toHaveBeenCalledWith('users', 'editor-1', { role: 'admin' })
      })
    })
  }
})
