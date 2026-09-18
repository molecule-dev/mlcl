import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxProjects / maxTracks / maxEffects / maxInstruments were defined in tiers.ts and shown on Pricing
// as enforced, but enforceLimit was never called anywhere, so any tier could create unlimited of each.
// Each create route now gates on its limit, counting the owning table by user_id.

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

// Importing each router registers its enforceLimit config.
await import('../handlers/projects.js')
await import('../handlers/tracks.js')
await import('../handlers/effects.js')
await import('../handlers/instruments.js')
await import('../handlers/exports.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('music-daw tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; limitKey: string; table: string }> = [
    { limitType: 'maxProjects', limitKey: 'maxProjects', table: 'music_projects' },
    { limitType: 'maxTracks', limitKey: 'maxTracks', table: 'audio_tracks' },
    { limitType: 'maxEffects', limitKey: 'maxEffects', table: 'audio_effects' },
    { limitType: 'maxInstruments', limitKey: 'maxInstruments', table: 'instruments' },
    { limitType: 'maxExports', limitKey: 'maxExports', table: 'audio_exports' },
  ]

  for (const { limitType, limitKey, table } of cases) {
    it(`gates ${table} create on ${limitType} (count ${table} by user_id)`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitKey]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [
        { field: 'user_id', operator: '=', value: 'u1' },
      ])
    })
  }
})
