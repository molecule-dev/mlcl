import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, getUserId, promote } = vi.hoisted(() => ({
  db: { findMany: vi.fn(), count: vi.fn() },
  getUserId: vi.fn(),
  promote: vi.fn(),
}))
vi.mock('@molecule/api-database', () => ({
  ...db,
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId, getParamId: vi.fn() }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({ t: (key: string) => key }))
vi.mock('@molecule/api-image', () => ({ convert: vi.fn(), resize: vi.fn() }))
vi.mock('@molecule/api-logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('@molecule/api-search', () => ({ index: vi.fn(), search: vi.fn() }))
vi.mock('../handlers/_scheduled.js', () => ({ promoteDueScheduledPosts: promote }))

import router from '../handlers/posts.js'

const route = (
  router.stack as {
    route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
  }[]
).find((layer) => layer.route?.path === '/mine/all' && layer.route.methods.get)!.route!
const list = route.stack.at(-1)!.handle as (req: Request, res: Response) => Promise<void>
const validate = route.stack[0].handle as RequestHandler
async function request(query: Record<string, string>) {
  const req = { query } as unknown as Request
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
  // Exercise the real query validator: unknown query keys are stripped, so the
  // count opt-in has to be part of the actual schema consumed by the route.
  await new Promise<void>((resolve, reject) =>
    validate(req, res, (error) => (error ? reject(error) : resolve())),
  )
  await list(req, res)
  return res
}
beforeEach(() => {
  vi.resetAllMocks()
  getUserId.mockReturnValue('author-1')
  db.findMany.mockResolvedValue([{ id: 'post-21' }])
  db.count.mockResolvedValue(60)
  promote.mockResolvedValue(0)
})
describe('private posts paginated response', () => {
  it('returns the author/status total while reading the URL page of twenty posts', async () => {
    const res = await request({ page: '2', limit: '20', status: 'draft', include_total: 'true' })
    const where = [
      { field: 'author_id', operator: '=', value: 'author-1' },
      { field: 'status', operator: '=', value: 'draft' },
    ]
    expect(db.findMany).toHaveBeenCalledWith('posts', {
      where,
      offset: 20,
      limit: 20,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    expect(db.count).toHaveBeenCalledWith('posts', where)
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: 'post-21' }],
      total: 60,
      page: 2,
      limit: 20,
    })
  })
  it('keeps the array response for existing callers without the opt-in', async () => {
    const res = await request({})
    expect(res.json).toHaveBeenCalledWith([{ id: 'post-21' }])
    expect(db.count).not.toHaveBeenCalled()
  })
  it('does not read private posts or promote scheduled posts without a session', async () => {
    getUserId.mockReturnValue(null)
    const res = await request({ include_total: 'true' })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(db.findMany).not.toHaveBeenCalled()
    expect(db.count).not.toHaveBeenCalled()
    expect(promote).not.toHaveBeenCalled()
  })
})
