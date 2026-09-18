import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// tiers.ts documents that limits are "enforced by enforceLimit(...) on the relevant POST routes",
// but only maxCourses was wired — module creation (POST /modules) and assignment creation
// (POST /assignments) skipped enforceLimit, so free-tier users blew past maxModulesPerCourse (5)
// and maxAssignments (10). Both create routes must now register their limit.

type LimitConfig = {
  limitType: string
  getLimit: (l: Record<string, number>) => number
  getCurrent: (userId: string, req: Request) => Promise<number> | number
}
const { configs, staffCourseIds } = vi.hoisted(() => ({
  configs: [] as LimitConfig[],
  staffCourseIds: vi.fn(),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: (config: LimitConfig) => {
    configs.push(config)
    return (_req: Request, _res: Response, next: () => void) => next()
  },
}))

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
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
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_lmsAccess.js', () => ({
  requireUserId: () => 'u1',
  assertCourseStaff: vi.fn(async () => true),
  assertEnrolled: vi.fn(async () => true),
  enrolledCourseIds: vi.fn(async () => []),
  isCourseStaff: vi.fn(async () => true),
  canReadCourse: vi.fn(async () => true),
  staffCourseIds,
}))

await import('../handlers/modules.js')
await import('../handlers/assignments.js')

const modulesLimit = (): LimitConfig | undefined =>
  configs.find((c) => c.limitType === 'maxModulesPerCourse')
const assignmentsLimit = (): LimitConfig | undefined =>
  configs.find((c) => c.limitType === 'maxAssignments')

beforeEach(() => vi.clearAllMocks())

describe('POST /modules enforces maxModulesPerCourse', () => {
  it('registers a maxModulesPerCourse limit reading limits.maxModulesPerCourse', () => {
    const cfg = modulesLimit()
    expect(cfg).toBeDefined()
    expect(cfg!.getLimit({ maxModulesPerCourse: 5 })).toBe(5)
  })

  it('counts existing modules in the request-targeted course (per-course scope)', async () => {
    db.count.mockResolvedValue(3)
    const req = { body: { course_id: 'course-7' } } as unknown as Request
    const n = await modulesLimit()!.getCurrent('u1', req)
    expect(n).toBe(3)
    expect(db.count).toHaveBeenCalledWith('course_modules', [
      { field: 'course_id', operator: '=', value: 'course-7' },
    ])
  })
})

describe('POST /assignments enforces maxAssignments', () => {
  it('registers a maxAssignments limit reading limits.maxAssignments', () => {
    const cfg = assignmentsLimit()
    expect(cfg).toBeDefined()
    expect(cfg!.getLimit({ maxAssignments: 10 })).toBe(10)
  })

  it("counts assignments across the instructor's staffed courses", async () => {
    staffCourseIds.mockResolvedValue(['course-1', 'course-2'])
    db.count.mockResolvedValue(7)
    const n = await assignmentsLimit()!.getCurrent('u1', {} as Request)
    expect(n).toBe(7)
    expect(db.count).toHaveBeenCalledWith('assignments', [
      { field: 'course_id', operator: 'in', value: ['course-1', 'course-2'] },
    ])
  })

  it('returns 0 without counting when the instructor staffs no courses', async () => {
    staffCourseIds.mockResolvedValue([])
    const n = await assignmentsLimit()!.getCurrent('u1', {} as Request)
    expect(n).toBe(0)
    expect(db.count).not.toHaveBeenCalled()
  })
})
