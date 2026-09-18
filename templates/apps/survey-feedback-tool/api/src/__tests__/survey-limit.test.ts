import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxSurveys was defined in tiers.ts and advertised in Pricing as enforced, but enforceLimit was never
// called anywhere, so any tier could create unlimited surveys. POST /surveys now gates on maxSurveys,
// counting the surveys table by owner_id. (maxQuestions is per-survey via a join — not a clean
// per-user count — so it is not enforced here.)

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
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-resource-user', () => ({
  authorization: {
    verifyMiddleware: () => (_req: Request, _res: Response, next: () => void) => next(),
  },
}))

// Importing the router registers its enforceLimit config.
await import('../handlers/surveys.js')

describe('survey-feedback-tool enforces maxSurveys on survey create', () => {
  it('gates surveys create on maxSurveys (count surveys by owner_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxSurveys')
    expect(c, 'maxSurveys enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxSurveys: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('surveys', [
      { field: 'owner_id', operator: '=', value: 'u1' },
    ])
  })
})
