import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FindManyOptions, WhereCondition } from '@molecule/api-database'

const { db } = vi.hoisted(() => ({ db: { findMany: vi.fn(), findById: vi.fn(), count: vi.fn() } }))
vi.mock('@molecule/api-database', () => ({
  ...db,
  create: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-i18n', () => ({ t: (key: string) => key }))
vi.mock('@molecule/api-logger', () => ({ logger: { error: vi.fn() } }))

import router from '../handlers/admin.js'

const route = (
  router.stack as {
    route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
  }[]
).find((layer) => layer.route?.path === '/orders' && layer.route.methods.get)!.route!
const list = route.stack.at(-1)!.handle as (req: Request, res: Response) => Promise<void>
const orders = Array.from({ length: 230 }, (_, i) => ({
  id: (i < 205 ? 'order-' : 'wanted-') + i,
  user_id: 'u1',
  status: i < 205 ? 'delivered' : 'pending',
  created_at: i < 205 ? new Date('2026-10-01') : new Date('2026-11-02'),
}))
function matching(where: WhereCondition[] = []) {
  return orders.filter((order) =>
    where.every((condition) => {
      const value = order[condition.field as keyof typeof order]
      if (condition.operator === '=') return value === condition.value
      if (condition.operator === '>=') return (value as Date) >= (condition.value as Date)
      if (condition.operator === '<') return (value as Date) < (condition.value as Date)
      throw new Error('Unexpected operator: ' + condition.operator)
    }),
  )
}
function response(signedIn = true): Response {
  return {
    locals: { session: signedIn ? { userId: 'admin' } : undefined },
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response
}
beforeEach(() => {
  vi.resetAllMocks()
  db.findMany.mockImplementation(async (_table: string, options: FindManyOptions) =>
    matching(options.where).slice(
      options.offset ?? 0,
      (options.offset ?? 0) + (options.limit ?? 50),
    ),
  )
  db.count.mockImplementation(
    async (_table: string, where: WhereCondition[]) => matching(where).length,
  )
  db.findById.mockResolvedValue({ id: 'u1', name: 'Ada' })
})
describe('admin orders filtered pagination', () => {
  it('finds matches beyond the first scan batch before paginating and counting', async () => {
    const res = response()
    await list({ query: { q: 'wanted', page: '2', limit: '10' } } as unknown as Request, res)
    const payload = vi.mocked(res.json).mock.calls[0][0] as {
      data: { id: string }[]
      total: number
    }
    expect(payload.total).toBe(25)
    expect(payload.data).toHaveLength(10)
    expect(payload.data[0].id).toBe('wanted-215')
    expect(db.findMany.mock.calls.map(([, options]) => options.offset)).toEqual([0, 200])
  })
  it('searches the displayed customer name as well as the order ID', async () => {
    const res = response()
    await list({ query: { q: 'ADA', page: '2', limit: '10' } } as unknown as Request, res)
    const payload = vi.mocked(res.json).mock.calls[0][0] as {
      data: { id: string; customer_name: string }[]
      total: number
    }
    expect(payload.total).toBe(230)
    expect(payload.data[0]).toMatchObject({ id: 'order-10', customer_name: 'Ada' })
    expect(db.findById).toHaveBeenCalledTimes(1)
  })
  it('scopes rows and totals by status and the selected calendar range', async () => {
    const res = response()
    await list(
      {
        query: {
          status: 'pending',
          start_date: '2026-11-02',
          end_date: '2026-11-03',
          page: '2',
          limit: '10',
        },
      } as unknown as Request,
      res,
    )
    expect(db.count).toHaveBeenCalledWith('orders', [
      { field: 'status', operator: '=', value: 'pending' },
      { field: 'created_at', operator: '>=', value: new Date('2026-11-02') },
      { field: 'created_at', operator: '<', value: new Date('2026-11-03') },
    ])
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 25,
        page: 2,
        limit: 10,
        data: expect.arrayContaining([expect.objectContaining({ id: 'wanted-215' })]),
      }),
    )
  })
  it('keeps ordinary unfiltered pagination and ignores malformed calendar bounds', async () => {
    const res = response()
    await list(
      { query: { page: '2', limit: '10', start_date: 'invalid' } } as unknown as Request,
      res,
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 230,
        page: 2,
        limit: 10,
        data: expect.arrayContaining([expect.objectContaining({ id: 'order-10' })]),
      }),
    )
    expect(db.findMany).toHaveBeenCalledTimes(1)
  })
  it('does not read data without a session', async () => {
    const res = response(false)
    await list({ query: { q: 'wanted' } } as unknown as Request, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(db.findMany).not.toHaveBeenCalled()
    expect(db.count).not.toHaveBeenCalled()
  })
})
