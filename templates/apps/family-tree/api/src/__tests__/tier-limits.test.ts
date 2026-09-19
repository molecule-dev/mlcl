import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The quantity limit in tiers.ts (maxPeople) is advertised on Pricing
// (CATALOG claims it gated), so the people create route must call
// enforceLimit, counting the owning table by user_id.

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
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn(async () => undefined) }))

// Importing the router registers its enforceLimit config.
await import('../handlers/people.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('family-tree tier limits are enforced on create', () => {
  it('gates people create on maxPeople (count people by user_id)', async () => {
    const c = cfg('maxPeople')
    expect(c, 'maxPeople enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxPeople: 25 })).toBe(25)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('people', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
