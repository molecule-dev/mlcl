import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// tiers.ts advertises maxQueries per plan (Free 5) and the Pricing page shows it, but POST /saved
// never called enforceLimit (unlike the sibling connections handler's maxConnections), so a free
// user could create unlimited saved queries. The create route must register its tier-limit gate.

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
vi.mock('@molecule/api-database-remote', () => ({ connectRemote: vi.fn() }))
vi.mock('@molecule/api-encryption', () => ({ decrypt: vi.fn() }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

// Importing the router registers the enforceLimit configs.
await import('../handlers/queries.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

beforeEach(() => count.mockClear())

describe('saved-query create enforces maxQueries', () => {
  it('registers the gate and reads limits.maxQueries', () => {
    expect(cfg('maxQueries')).toBeDefined()
    expect(cfg('maxQueries')?.getLimit({ maxQueries: 5 })).toBe(5)
  })

  it('counts the caller-owned saved_queries', async () => {
    await cfg('maxQueries')?.getCurrent('u1')
    expect(count).toHaveBeenCalledWith('saved_queries', [
      { field: 'user_id', operator: '=', value: 'u1' },
    ])
  })
})
