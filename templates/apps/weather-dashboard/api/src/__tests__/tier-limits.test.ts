import { describe, expect, it, vi } from 'vitest'

// weather-dashboard advertises tier limits (tiers.ts FREE_LIMITS.maxLocations=5, shown on
// Pricing) and wires setupEntitlements() at boot, but POST /locations never enforced
// maxLocations — a user on any tier could save unlimited locations. This asserts the
// enforceLimit config now wired onto the create route (config-capture pattern).

const captured = vi.hoisted(() => [] as Array<Record<string, unknown>>)
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: Record<string, unknown>) => {
    captured.push(config)
    return (_req: unknown, _res: unknown, next: () => void) => next()
  },
}))
vi.mock('@molecule/api-database', () => ({
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => []),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'p1',
}))
vi.mock('@molecule/api-geolocation', () => ({ geocode: vi.fn() }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: unknown, _s: unknown, next: () => void) => next(),
}))

// Importing the router runs enforceLimit(...) at module load, capturing the config.
import '../handlers/locations.js'

import { count } from '@molecule/api-database'

describe('weather-dashboard tier limits', () => {
  it('enforces maxLocations on POST /locations, counting the user’s own locations', async () => {
    const cfg = captured.find((c) => c.limitType === 'maxLocations')
    expect(cfg).toBeDefined()
    expect((cfg!.getLimit as (l: { maxLocations: number }) => number)({ maxLocations: 5 })).toBe(5)
    await (cfg!.getCurrent as (userId: string) => Promise<number>)('u1')
    expect(count).toHaveBeenCalledWith('locations', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
