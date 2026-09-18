import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxClips / maxCategories were defined in tiers.ts and advertised in CATALOG as enforced, but
// enforceLimit was never called, so any tier could create unlimited clips and categories. Each create
// route now gates on its limit, counting the owning table by owner_id. (maxPinned is a subset cap on a
// pin toggle route — enforcing it as create-style middleware would wrongly block unpinning at the cap,
// so it is intentionally not enforced here.)

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
vi.mock('@molecule/api-encryption', () => ({ decrypt: vi.fn(), encrypt: vi.fn() }))
vi.mock('@molecule/api-search', () => ({
  deleteDocument: vi.fn(),
  index: vi.fn(),
  search: vi.fn(),
}))
vi.mock('../lib/authz.js', () => ({
  requireUser: () => 'u1',
  internalError: vi.fn(),
  validationError: vi.fn(),
  requireClip: vi.fn(),
  requireCategory: vi.fn(),
}))

await import('../handlers/clips.js')
await import('../handlers/categories.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('clipboard-manager tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; limitKey: string; table: string }> = [
    { limitType: 'maxClips', limitKey: 'maxClips', table: 'clips' },
    { limitType: 'maxCategories', limitKey: 'maxCategories', table: 'categories' },
  ]

  for (const { limitType, limitKey, table } of cases) {
    it(`gates ${table} create on ${limitType} (count ${table} by owner_id)`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitKey]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [
        { field: 'owner_id', operator: '=', value: 'u1' },
      ])
    })
  }
})
