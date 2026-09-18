import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// contacts.ts enforced maxContacts, but deals/companies/activities creation skipped enforceLimit —
// so free-tier users could create unlimited deals/companies/activities despite the tier caps.
// Each POST / must register its limit, scoped to the caller's owner_id count.

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
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
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
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

// importing the routers registers each enforceLimit config
await import('../handlers/deals.js')
await import('../handlers/companies.js')
await import('../handlers/activities.js')

const cfg = (type: string) => configs.find((c) => c.limitType === type)

beforeEach(() => vi.clearAllMocks())

describe('crm resource creation enforces tier limits', () => {
  it.each([
    ['maxDeals', 'deals'],
    ['maxCompanies', 'companies'],
    ['maxActivities', 'activities'],
  ])('%s counts the caller-owned %s rows', async (limitType, table) => {
    const c = cfg(limitType)
    expect(c).toBeDefined()
    expect(c!.getLimit({ [limitType]: 7 })).toBe(7)
    db.count.mockResolvedValue(2)
    const n = await c!.getCurrent('u1')
    expect(n).toBe(2)
    expect(db.count).toHaveBeenCalledWith(table, [
      { field: 'owner_id', operator: '=', value: 'u1' },
    ])
  })
})
