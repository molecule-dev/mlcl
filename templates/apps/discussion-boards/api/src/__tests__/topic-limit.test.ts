import { describe, expect, it, vi } from 'vitest'

// tiers.ts defines maxTopics per plan and Pricing advertises it, but POST /topics never called
// enforceLimit — any tier could create unlimited topics. It's now enforced (mirrors sibling forum's
// maxThreads). This captures the enforceLimit config and asserts it caps topics by author_id.

interface LimitConfig {
  limitType: string
  getLimit: (l: { maxTopics: number }) => number
  getCurrent: (userId: string) => Promise<number>
}
const configs: LimitConfig[] = []
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: LimitConfig) => {
    configs.push(config)
    return (_r: unknown, _s: unknown, next: () => void) => next()
  },
}))

const dbCount = vi.fn(async (..._a: unknown[]) => 0)
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => dbCount(...a),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
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
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: unknown, _s: unknown, n: () => void) => n(),
  validateQuery: () => (_r: unknown, _s: unknown, n: () => void) => n(),
}))
vi.mock('@molecule/api-search', () => ({ index: vi.fn(), search: vi.fn() }))

await import('../handlers/topics.js')

describe('discussion-boards enforces maxTopics on create', () => {
  const cfg = configs.find((c) => c.limitType === 'maxTopics')

  it('registers the maxTopics enforcement', () => {
    expect(cfg).toBeDefined()
    expect(cfg?.getLimit({ maxTopics: 5 })).toBe(5)
  })

  it('counts topics authored by the user', async () => {
    dbCount.mockClear()
    await cfg?.getCurrent('u1')
    expect(dbCount).toHaveBeenCalledWith('topics', [
      { field: 'author_id', operator: '=', value: 'u1' },
    ])
  })
})
