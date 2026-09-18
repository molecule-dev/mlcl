import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxTeams was defined in tiers.ts and advertised in Pricing as enforced, but enforceLimit was never
// called anywhere, so any tier could create unlimited teams. POST /teams now gates on maxTeams,
// counting the teams table by owner_user_id.

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
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-search', () => ({
  hasProvider: () => false,
  index: vi.fn(),
  search: vi.fn(),
}))

// Importing the router registers its enforceLimit config.
await import('../handlers/teams.js')

describe('sports-league enforces maxTeams on team create', () => {
  it('gates teams create on maxTeams (count teams by owner_user_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxTeams')
    expect(c, 'maxTeams enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxTeams: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('teams', [
      { field: 'owner_user_id', operator: '=', value: 'u1' },
    ])
  })
})
