import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxAccessPolicies was defined in tiers.ts and advertised in CATALOG as enforced, but POST
// /access-policies never called enforceLimit — while the sibling maxSecrets IS enforced on POST
// /secrets. A Free user (cap 5) could create unlimited access policies. The create route now gates
// on maxAccessPolicies, counting access_policies by user_id (mirrors the secrets.ts sibling).

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
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

// Importing the router registers its enforceLimit config.
await import('../handlers/access-policies.js')

describe('secrets-manager enforces maxAccessPolicies on access-policy create', () => {
  it('gates access_policies create on maxAccessPolicies (count access_policies by user_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxAccessPolicies')
    expect(c, 'maxAccessPolicies enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxAccessPolicies: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('access_policies', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
