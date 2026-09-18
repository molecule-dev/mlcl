import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The /articles/for-you feed selected articles from ALL of a user's user_interests rows, filtering
// only on user_id. But deactivating an interest flips user_interests.active=false (the topic-follow
// toggle), and the feed ignored that — a deactivated category kept appearing. The query must filter
// active=true, mirroring the following-flag query in topics.ts.

type Where = Array<{ field: string; operator: string; value: unknown }>
const findManyCalls: Array<{ table: string; where?: Where }> = []
const findMany = vi.fn(async (table: string, opts: { where?: Where } = {}) => {
  findManyCalls.push({ table, where: opts.where })
  if (table === 'user_interests') return [{ category_id: 'cat-1' }]
  return []
})

vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => findMany(a[0] as string, a[1] as { where?: Where }),
  findById: vi.fn(async () => null),
  findOne: vi.fn(async () => null),
  create: vi.fn(async () => ({ data: {} })),
  updateById: vi.fn(async () => ({ data: {} })),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))
vi.mock('@molecule/api-search', () => ({ search: vi.fn(async () => ({ results: [] })) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const articles = (await import('../handlers/articles.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/articles', articles)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
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
  findManyCalls.length = 0
})

describe('for-you feed honors user_interests.active', () => {
  it('queries only ACTIVE interests when building the feed', async () => {
    const res = await fetch(`${baseUrl}/articles/for-you?page=1&limit=10`, {
      headers: { 'x-test-user': 'u1' },
    })
    expect(res.status).toBe(200)
    const interestQuery = findManyCalls.find((c) => c.table === 'user_interests')
    expect(interestQuery, 'for-you must query user_interests').toBeDefined()
    expect(interestQuery?.where).toEqual(
      expect.arrayContaining([
        { field: 'user_id', operator: '=', value: 'u1' },
        { field: 'active', operator: '=', value: true },
      ]),
    )
  })
})
