import { beforeEach, describe, expect, it, vi } from 'vitest'

// The maxLists tier limit (free plan = 5) is advertised on Pricing but the list-create route had no
// enforceLimit gate (its siblings maxBoards/maxCards did), so a free user could create unlimited
// lists. This asserts the route is now wired to enforce maxLists, counting the user's own lists.

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
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ requireUser: () => 'user-1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn() }))

// Importing the handler registers the route, which invokes enforceLimit(config) at module load.
await import('../handlers/lists.js')

beforeEach(() => {
  count.mockClear()
})

describe('list-create enforces the maxLists tier limit', () => {
  const cfg = () => captured.find((c) => c.limitType === 'maxLists')

  it('registers an enforceLimit gate for maxLists', () => {
    expect(cfg()).toBeDefined()
  })

  it('reads the limit from the tier limits', () => {
    expect(cfg()?.getLimit({ maxLists: 5, maxBoards: 3, maxCards: 100 })).toBe(5)
  })

  it("counts the user's own lists (board_lists by owner_id)", async () => {
    await cfg()?.getCurrent('user-1')
    expect(count).toHaveBeenCalledWith('board_lists', [
      { field: 'owner_id', operator: '=', value: 'user-1' },
    ])
  })
})
