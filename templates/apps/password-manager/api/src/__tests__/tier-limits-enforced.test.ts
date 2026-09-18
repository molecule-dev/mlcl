import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// tiers.ts advertises maxItems / maxVaults per plan, but the create routes never called enforceLimit
// (the fixtures even ship more items than the free cap), so a free user could create unlimited items
// and vaults. POST /items and POST /vaults must register their tier-limit gate.

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
const count = vi.fn(async (..._a: unknown[]) => 0)
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => count(...a),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-encryption', () => ({ encrypt: vi.fn(), decrypt: vi.fn() }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

// Importing the routers registers the enforceLimit configs.
await import('../handlers/items.js')
await import('../handlers/vaults.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

beforeEach(() => count.mockClear())

describe('vault-item create enforces maxItems', () => {
  it('registers the gate and reads limits.maxItems', () => {
    expect(cfg('maxItems')).toBeDefined()
    expect(cfg('maxItems')?.getLimit({ maxItems: 5 })).toBe(5)
  })
  it('counts the caller-owned vault_items', async () => {
    await cfg('maxItems')?.getCurrent('u1')
    expect(count).toHaveBeenCalledWith('vault_items', [
      { field: 'owner_id', operator: '=', value: 'u1' },
    ])
  })
})

describe('vault create enforces maxVaults', () => {
  it('registers the gate and reads limits.maxVaults', () => {
    expect(cfg('maxVaults')).toBeDefined()
    expect(cfg('maxVaults')?.getLimit({ maxVaults: 5 })).toBe(5)
  })
  it('counts the caller-owned vaults', async () => {
    await cfg('maxVaults')?.getCurrent('u1')
    expect(count).toHaveBeenCalledWith('vaults', [
      { field: 'owner_id', operator: '=', value: 'u1' },
    ])
  })
})
