import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// The tier limits (maxComponents / maxIncidents / maxSubscribers) were defined in tiers.ts, the
// entitlements provider was wired at boot, and Pricing/CATALOG advertised them as enforced — but no
// handler called enforceLimit, so a Free user (cap 5) could create unlimited components, incidents,
// and subscribers. Each create route now gates on its limit, counting the owning table by user_id.
// This test asserts the enforceLimit wiring is present and counts the correct table/column.

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

// Importing each router registers its enforceLimit config.
await import('../handlers/components.js')
await import('../handlers/incidents.js')
await import('../handlers/subscribers.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('status-page tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; limitKey: string; table: string }> = [
    { limitType: 'maxComponents', limitKey: 'maxComponents', table: 'status_components' },
    { limitType: 'maxIncidents', limitKey: 'maxIncidents', table: 'incidents' },
    { limitType: 'maxSubscribers', limitKey: 'maxSubscribers', table: 'status_subscribers' },
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
