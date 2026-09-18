import { describe, expect, it, vi } from 'vitest'

// maxBookings is defined in tiers.ts + advertised, and bonds/index.ts claims the bookings handler
// enforces it — but only pets.ts (maxPets) actually did. The booking create route now gates on
// maxBookings, counting the user's own bookings by owner_user_id (mirroring the maxPets gate).

type LimitConfig = {
  limitType: string
  getLimit: (l: Record<string, number>) => number
  getCurrent: (userId: string) => Promise<number>
}
const { configs } = vi.hoisted(() => ({ configs: [] as LimitConfig[] }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: LimitConfig) => {
    configs.push(config)
    return (_req: unknown, _res: unknown, next: () => void) => next()
  },
}))
const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'id1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: unknown, _s: unknown, n: () => void) => n(),
}))

await import('../handlers/bookings.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('pet-care enforces maxBookings on booking create', () => {
  it('registers a maxBookings gate that counts the user’s own bookings by owner_user_id', async () => {
    const c = cfg('maxBookings')
    expect(c, 'maxBookings enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxBookings: 5 })).toBe(5)
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('bookings', [
      { field: 'owner_user_id', operator: '=', value: 'u1' },
    ])
  })
})
