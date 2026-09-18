import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// maxBookmarks / maxSources are defined in tiers.ts and advertised on Pricing (CATALOG claims them
// gated), but POST /bookmarks and POST /sources never called enforceLimit, so any tier could create
// unlimited. Each create route now gates on its limit, counting the owning table by its owner
// column (bookmarks."userId" camelCase; sources.user_id — global admin sources have user_id NULL).

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
  findOne: vi.fn(),
  query: vi.fn(async (..._a: unknown[]) => ({ rows: [] })),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  query: (...a: unknown[]) => db.query(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

// Importing each router registers its enforceLimit config.
await import('../handlers/bookmarks.js')
await import('../handlers/sources.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('news-aggregator tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; table: string; field: string }> = [
    { limitType: 'maxBookmarks', table: 'bookmarks', field: 'userId' },
    { limitType: 'maxSources', table: 'sources', field: 'user_id' },
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
