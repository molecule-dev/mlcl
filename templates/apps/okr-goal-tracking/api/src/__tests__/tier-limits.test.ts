import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxObjectives / maxKeyResults were defined in tiers.ts and advertised in CATALOG as enforced, but
// enforceLimit was never called anywhere, so any tier could create unlimited objectives + key results.
// Each create route now gates on its limit, counting the owning table by owner_id. (maxCheckIns is
// intentionally NOT enforced: check-ins are periodic progress updates that accumulate over time, so a
// total-count cap would break tracking after a few updates — objectives + key results are the bounded
// per-user entities.)

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
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: () => 'u1',
  validationError: (res: Response, _issues: unknown) =>
    res.status(400).json({ error: 'validation' }),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Importing each router registers its enforceLimit config.
await import('../handlers/objectives.js')
await import('../handlers/key-results.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('okr-goal-tracking tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; limitKey: string; table: string }> = [
    { limitType: 'maxObjectives', limitKey: 'maxObjectives', table: 'objectives' },
    { limitType: 'maxKeyResults', limitKey: 'maxKeyResults', table: 'key_results' },
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

  it('does not enforce maxCheckIns (check-ins accumulate over time, not a bounded entity)', () => {
    expect(cfg('maxCheckIns')).toBeUndefined()
  })
})
