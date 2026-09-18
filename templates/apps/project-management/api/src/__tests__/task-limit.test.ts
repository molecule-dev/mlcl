import { describe, expect, it, vi } from 'vitest'

// maxTasks is defined in tiers.ts and advertised on the Pricing page, but only maxProjects was
// enforced — task create ignored the cap, so a Free user (100) could create unlimited tasks. The
// create route now gates on maxTasks, counting the user's own tasks by created_by (mirroring the
// maxProjects gate). This asserts the enforceLimit wiring registers with the correct count.

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
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => {}) }))
vi.mock('@molecule/api-search', () => ({
  index: vi.fn(async () => {}),
  deleteDocument: vi.fn(async () => {}),
  search: vi.fn(async () => ({ results: [] })),
}))
vi.mock('../handlers/_ownership.js', () => ({
  getUserId: () => 'u1',
  accessibleProjectIds: vi.fn(async () => []),
  projectIfAccessible: vi.fn(async () => null),
  taskAccessible: vi.fn(async () => null),
}))

await import('../handlers/tasks.js')

const cfg = (limitType: string) => configs.find((c) => c.limitType === limitType)

describe('project-management enforces maxTasks on task create', () => {
  it('registers a maxTasks gate that counts the user’s own tasks by created_by', async () => {
    const c = cfg('maxTasks')
    expect(c, 'maxTasks enforceLimit config should be registered').toBeDefined()
    expect(c?.getLimit({ maxTasks: 100 })).toBe(100)
    await c?.getCurrent('u1')
    expect(db.count).toHaveBeenCalledWith('tasks', [
      { field: 'created_by', operator: '=', value: 'u1' },
    ])
  })
})
