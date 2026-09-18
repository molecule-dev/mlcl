import { beforeEach, describe, expect, it, vi } from 'vitest'

// tiers.ts advertises maxKbArticles / maxMacros per plan (and its docstring claims enforceLimit gates
// the POST routes), but only maxOpenTickets was ever wired. A Free workspace could create unlimited
// KB articles / macros. This asserts both create routes now enforce their tier limit.

const captured: Array<{
  limitType: string
  getLimit: (l: Record<string, number>) => number
  getCurrent: (userId: string) => Promise<number>
}> = []
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: (typeof captured)[number]) => {
    captured.push(config)
    return (_req: unknown, _res: unknown, next: () => void) => next()
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
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('../middleware/require-admin.js', () => ({
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

await import('../handlers/articles.js')
await import('../handlers/macros.js')

beforeEach(() => {
  count.mockClear()
})

const cfg = (limitType: string) => captured.find((c) => c.limitType === limitType)

describe('KB article create enforces maxKbArticles', () => {
  it('registers the gate and reads the tier limit', () => {
    expect(cfg('maxKbArticles')).toBeDefined()
    expect(cfg('maxKbArticles')?.getLimit({ maxKbArticles: 10 })).toBe(10)
  })
  it("counts the operator's own articles (kb_articles by author_id)", async () => {
    await cfg('maxKbArticles')?.getCurrent('u1')
    expect(count).toHaveBeenCalledWith('kb_articles', [
      { field: 'author_id', operator: '=', value: 'u1' },
    ])
  })
})

describe('macro create enforces maxMacros', () => {
  it('registers the gate and reads the tier limit', () => {
    expect(cfg('maxMacros')).toBeDefined()
    expect(cfg('maxMacros')?.getLimit({ maxMacros: 5 })).toBe(5)
  })
  it("counts the operator's own macros (macros by created_by)", async () => {
    await cfg('maxMacros')?.getCurrent('u1')
    expect(count).toHaveBeenCalledWith('macros', [
      { field: 'created_by', operator: '=', value: 'u1' },
    ])
  })
})
