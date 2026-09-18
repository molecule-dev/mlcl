import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// maxListings / maxBids / maxWatchlist are defined in tiers.ts and advertised on Pricing (CATALOG
// claims them gated), but POST /listings, POST /bids, and POST /watchlist never called enforceLimit
// (watchlist had only a dup-guard), so any tier could create unlimited. Each create route now gates
// on its limit, counting the owning table by its owner column.

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
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-image', () => ({ resize: vi.fn(async () => Buffer.from('')) }))
vi.mock('@molecule/api-search', () => ({
  index: vi.fn(async () => undefined),
  deleteDocument: vi.fn(async () => undefined),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => undefined) }))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => undefined) }))
vi.mock('../handlers/_notify.js', () => ({ notificationEnabled: vi.fn(async () => true) }))

// Importing each router registers its enforceLimit config.
await import('../handlers/listings.js')
await import('../handlers/bids.js')
await import('../handlers/watchlist.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('auction-platform tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; table: string; field: string }> = [
    { limitType: 'maxListings', table: 'listings', field: 'seller_id' },
    { limitType: 'maxBids', table: 'bids', field: 'bidder_id' },
    { limitType: 'maxWatchlist', table: 'watchlist', field: 'user_id' },
  ]

  for (const { limitType, table, field } of cases) {
    it(`gates ${table} create on ${limitType} (count ${table} by ${field})`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitType]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [{ field, operator: '=', value: 'u1' }])
    })
  }
})
