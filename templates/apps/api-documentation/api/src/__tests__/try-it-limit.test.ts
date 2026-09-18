import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxTryIt was defined in tiers.ts and shown on Pricing as enforced, but enforceLimit was never
// called on POST /try-it (only the sibling maxSpecs create was gated), so any user could run
// unlimited try-it requests regardless of tier. The route now gates on maxTryIt, counting
// try_it_history by user_id.

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
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
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
vi.mock('../lib/safe-fetch.js', () => ({ safeFetch: vi.fn() }))

await import('../handlers/try-it.js')

describe('api-documentation enforces maxTryIt on try-it create', () => {
  it('gates POST /try-it on maxTryIt (count try_it_history by user_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxTryIt')
    expect(c, 'maxTryIt enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxTryIt: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('try_it_history', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
