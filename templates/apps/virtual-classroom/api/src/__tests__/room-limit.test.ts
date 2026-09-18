import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxRooms was defined in tiers.ts + advertised in Pricing/CATALOG as enforced, but enforceLimit was
// never called anywhere, so any tier could create unlimited rooms. POST /rooms now gates on maxRooms,
// counting the rooms table by host_id (the room owner column). This test asserts the wiring is present
// and counts the correct table/column. (maxRecordings has no owner column — recordings key off
// room_id, a transitive count the simple count() can't express; maxChat is per-message telemetry;
// maxWhiteboard is auto-created one-per-room — none is a clean per-user entity cap, so only maxRooms
// is enforced.)

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
  findOne: vi.fn(),
  findMany: vi.fn((..._a: unknown[]) => []),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: () => 'u1',
  getUserId: () => 'u1',
  validationError: (res: Response, _issues: unknown) =>
    res.status(400).json({ error: 'validation' }),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? '',
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => undefined) }))

// Importing the router registers its enforceLimit config.
await import('../handlers/rooms.js')

describe('virtual-classroom enforces maxRooms on room create', () => {
  it('gates rooms create on maxRooms (count rooms by host_id)', async () => {
    const c = configs.find((cfg) => cfg.limitType === 'maxRooms')
    expect(c, 'maxRooms enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxRooms: 5 })).toBe(5)
    db.count.mockClear()
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('rooms', [
      { field: 'host_id', operator: '=', value: 'u1' },
    ])
  })
})
