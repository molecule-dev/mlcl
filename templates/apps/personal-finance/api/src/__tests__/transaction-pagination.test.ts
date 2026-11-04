import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, getUserId } = vi.hoisted(() => ({
  db: { findMany: vi.fn(), count: vi.fn() },
  getUserId: vi.fn(),
}))
vi.mock('@molecule/api-database', () => ({
  ...db,
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId, getParamId: vi.fn() }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({ t: (key: string) => key }))
vi.mock('@molecule/api-logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/transactions.js'

const route = (
  router.stack as {
    route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
  }[]
).find((layer) => layer.route?.path === '/' && layer.route.methods.get)!.route!
const list = route.stack.at(-1)!.handle as (req: Request, res: Response) => Promise<void>
function response(): Response {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response
}
beforeEach(() => {
  vi.resetAllMocks()
  getUserId.mockReturnValue('owner-1')
  db.findMany.mockResolvedValue([{ id: 'transaction-13' }])
  db.count.mockResolvedValue(25)
})
describe('transaction list pagination contract', () => {
  it('returns an opted-in total for the same private filter scope and requested offset', async () => {
    const res = response()
    await list(
      {
        query: {
          type: 'income',
          account_id: 'a1',
          start_date: '2026-11-01',
          include_total: 'true',
          limit: '12',
          offset: '12',
        },
      } as unknown as Request,
      res,
    )
    const where = [
      { field: 'user_id', operator: '=', value: 'owner-1' },
      { field: 'account_id', operator: '=', value: 'a1' },
      { field: 'type', operator: '=', value: 'income' },
      { field: 'date', operator: '>=', value: new Date('2026-11-01') },
    ]
    expect(db.findMany).toHaveBeenCalledWith('transactions', {
      where,
      orderBy: [{ field: 'date', direction: 'desc' }],
      limit: 12,
      offset: 12,
    })
    expect(db.count).toHaveBeenCalledWith('transactions', where)
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'transaction-13' }], total: 25 })
  })
  it.each([undefined, 'false'])(
    'retains the existing array response without a count for include_total=%s',
    async (include_total) => {
      const res = response()
      await list({ query: { include_total } } as unknown as Request, res)
      expect(res.json).toHaveBeenCalledWith([{ id: 'transaction-13' }])
      expect(db.count).not.toHaveBeenCalled()
    },
  )
  it('does not read rows or counts without a session', async () => {
    getUserId.mockReturnValue(null)
    const res = response()
    await list({ query: { include_total: 'true' } } as unknown as Request, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(db.findMany).not.toHaveBeenCalled()
    expect(db.count).not.toHaveBeenCalled()
  })

  it('searches description, category and notes across batches before applying the page offset', async () => {
    const all = Array.from({ length: 230 }, (_, i) => ({
      id: String(i),
      description: 'Transaction ' + i,
      category_name: '',
      notes: i >= 205 ? 'COFFEE' : '',
    }))
    db.findMany.mockImplementation(
      async (_table: string, options: { offset: number; limit: number }) =>
        all.slice(options.offset, options.offset + options.limit),
    )
    const res = response()
    await list(
      {
        query: { include_total: 'true', search: 'coffee', limit: '12', offset: '12' },
      } as unknown as Request,
      res,
    )
    const payload = vi.mocked(res.json).mock.calls[0][0] as {
      data: { id: string }[]
      total: number
    }
    expect(payload.total).toBe(25)
    expect(payload.data).toHaveLength(12)
    expect(payload.data[0].id).toBe('217')
    expect(db.count).not.toHaveBeenCalled()
    expect(db.findMany.mock.calls.map(([, options]) => options.offset)).toEqual([0, 200])
  })
})
