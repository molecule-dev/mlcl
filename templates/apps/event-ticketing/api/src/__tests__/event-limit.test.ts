import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxEvents was defined in tiers.ts and shown on Pricing as enforced, but enforceLimit was never
// called anywhere, so any tier could create unlimited events. POST /events now gates on maxEvents,
// counting the events table by user_id.

type LimitConfig = {
  limitType: string
  getLimit: (l: Record<string, number>) => number
  getCurrent: (userId: string) => Promise<number>
}
const { configs } = vi.hoisted(() => ({ configs: [] as LimitConfig[] }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: LimitConfig) => {
    configs.push(config)
    return (_req: Request, _res: Response, next: () => void) => next()
  },
}))
const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'id1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Importing the router registers its enforceLimit config.
await import('../handlers/events.js')

describe('event-ticketing enforces maxEvents on event create', () => {
  it('gates events create on maxEvents (count events by user_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxEvents')
    expect(c, 'maxEvents enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxEvents: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('events', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
