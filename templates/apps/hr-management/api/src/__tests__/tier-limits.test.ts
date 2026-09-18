import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// maxEmployees / maxDocuments / maxDepartments are defined in tiers.ts and advertised on Pricing
// (CATALOG claims them gated), but POST /employees, POST /documents, and POST /departments never
// called enforceLimit, so any tier could create unlimited. Each create route now gates on its limit,
// counting the owning table by user_id. (Departments can still be auto-created from an employee's
// free-text department_name via resolveDepartmentId — a documented ungated convenience path.)

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
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
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
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'id1',
  uuidParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('../handlers/_decorate.js', () => ({
  buildLookups: vi.fn(async () => ({})),
  decorateEmployee: vi.fn((r: unknown) => r),
  decorateDocument: vi.fn((r: unknown) => r),
}))
vi.mock('../handlers/_seed.js', () => ({ ensureSeeded: vi.fn(async () => undefined) }))

// Importing each router registers its enforceLimit config.
await import('../handlers/employees.js')
await import('../handlers/documents.js')
await import('../handlers/departments.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('hr-management tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; table: string }> = [
    { limitType: 'maxEmployees', table: 'employees' },
    { limitType: 'maxDocuments', table: 'documents' },
    { limitType: 'maxDepartments', table: 'departments' },
  ]

  for (const { limitType, table } of cases) {
    it(`gates ${table} create on ${limitType} (count ${table} by user_id)`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitType]: 25 })).toBe(25)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [
        { field: 'user_id', operator: '=', value: 'u1' },
      ])
    })
  }
})
