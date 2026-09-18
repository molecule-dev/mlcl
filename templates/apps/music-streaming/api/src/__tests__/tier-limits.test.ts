import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// maxPlaylists / maxTracks are defined in tiers.ts and shown on Pricing (CATALOG claims them gated),
// but POST /playlists and POST /tracks never called enforceLimit, so any tier could create unlimited
// playlists and tracks. Each create route now gates on its limit, counting the owning table by user_id.

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
  deleteMany: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(),
  updateById: vi.fn(),
  updateMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  updateMany: (...a: unknown[]) => db.updateMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  uuidParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-search', () => ({ search: vi.fn(async () => []) }))

// Importing each router registers its enforceLimit config.
await import('../handlers/playlists.js')
await import('../handlers/tracks.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('music-streaming tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; table: string }> = [
    { limitType: 'maxPlaylists', table: 'playlists' },
    { limitType: 'maxTracks', table: 'tracks' },
  ]

  for (const { limitType, table } of cases) {
    it(`gates ${table} create on ${limitType} (count ${table} by user_id)`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitType]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [
        { field: 'user_id', operator: '=', value: 'u1' },
      ])
    })
  }
})
