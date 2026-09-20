import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// maxStaff / maxWeeklyShifts are defined in tiers.ts and advertised on
// Pricing (CATALOG claims them gated) — both create routes must call
// enforceLimit, counting the owning table by user_id (shifts counted over
// the Monday-based week the new shift falls in).

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
  uuidParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('../handlers/_seed.js', () => ({ ensureSeeded: vi.fn(async () => undefined) }))

// Importing each router registers its enforceLimit config.
await import('../handlers/staff.js')
await import('../handlers/shifts.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('shift-scheduling tier limits are enforced on create', () => {
  it('gates staff create on maxStaff (count staff by user_id)', async () => {
    const c = cfg('maxStaff')
    expect(c, 'maxStaff enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxStaff: 15 })).toBe(15)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('staff', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })

  it("gates shift create on maxWeeklyShifts (count this week's shifts)", async () => {
    const c = cfg('maxWeeklyShifts')
    expect(c, 'maxWeeklyShifts enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxWeeklyShifts: 60 })).toBe(60)
    db.findMany.mockClear()
    // A shift in the current week and one far outside it — only the first counts.
    const week = new Date()
    const day = week.getUTCDay()
    week.setUTCDate(week.getUTCDate() + (day === 0 ? -6 : 1 - day))
    const inWeek = `${week.toISOString().slice(0, 10)}T10:00:00.000Z`
    db.findMany.mockResolvedValueOnce([
      { starts_at: inWeek },
      { starts_at: '2020-01-01T10:00:00.000Z' },
    ])
    await expect(c?.getCurrent('u1')).resolves.toBe(1)
    expect(db.findMany).toHaveBeenCalledWith('shifts', {
      where: [{ field: 'user_id', operator: '=', value: 'u1' }],
    })
  })
})
