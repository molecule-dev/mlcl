import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxPages / maxSpaces were defined in tiers.ts and shown on Pricing as enforced, but enforceLimit was
// never called anywhere, so any tier could create unlimited pages and spaces. Each create route now
// gates on its limit. Owner columns differ: wiki_pages.author_id vs wiki_spaces.owner_id.

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
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateQuery: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('@molecule/api-ai-summarization', () => ({
  hasProvider: () => false,
  requireProvider: () => ({}),
}))
vi.mock('@molecule/api-search', () => ({
  hasProvider: () => false,
  index: vi.fn(),
  search: vi.fn(),
}))

// Importing each router registers its enforceLimit config.
await import('../handlers/pages.js')
await import('../handlers/spaces.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('wiki tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; limitKey: string; table: string; ownerField: string }> = [
    { limitType: 'maxPages', limitKey: 'maxPages', table: 'wiki_pages', ownerField: 'author_id' },
    { limitType: 'maxSpaces', limitKey: 'maxSpaces', table: 'wiki_spaces', ownerField: 'owner_id' },
  ]

  for (const { limitType, limitKey, table, ownerField } of cases) {
    it(`gates ${table} create on ${limitType} (count ${table} by ${ownerField})`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitKey]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [
        { field: ownerField, operator: '=', value: 'u1' },
      ])
    })
  }
})
