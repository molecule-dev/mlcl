import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The events list schema declares `q` (search) and `is_free`, but the handler destructured
// neither — so the search box and the free-events filter did nothing. Wire both into the query.

const db = {
  findMany: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: Request) => req.params.id,
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/events.js'

type Where = Array<{ field: string; operator: string; value: unknown }>
function listHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const run = (query: Record<string, unknown>) =>
  listHandler()({ query } as unknown as Request, makeRes())
const whereOf = () => (db.findMany.mock.calls[0]?.[1] as { where: Where } | undefined)?.where ?? []

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([])
})

describe('events list search + free filter', () => {
  it('applies q as a case-insensitive title filter', async () => {
    await run({ q: 'concert', page: '1', limit: '20' })
    expect(whereOf()).toContainEqual({ field: 'title', operator: 'ilike', value: 'concert' })
  })

  it('applies is_free=true as a min_price=0 filter', async () => {
    await run({ is_free: 'true', page: '1', limit: '20' })
    expect(whereOf()).toContainEqual({ field: 'min_price', operator: '=', value: 0 })
  })

  it('does neither when the params are absent', async () => {
    await run({ page: '1', limit: '20' })
    const w = whereOf()
    expect(w.some((c) => c.operator === 'ilike')).toBe(false)
    expect(w.some((c) => c.field === 'min_price')).toBe(false)
  })
})
