import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Every quantity limit in tiers.ts (maxAllergies / maxConditions / maxDocuments / maxImmunizations /
// maxLabs / maxMedications / maxVitals) is advertised on Pricing (CATALOG claims them gated), but the
// create routes never called enforceLimit, so any tier could store unlimited health records. Each
// create route now gates on its limit, counting the owning table by user_id.

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
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn(async () => undefined) }))

// Importing each router registers its enforceLimit config.
await import('../handlers/allergies.js')
await import('../handlers/conditions.js')
await import('../handlers/documents.js')
await import('../handlers/immunizations.js')
await import('../handlers/labs.js')
await import('../handlers/medications.js')
await import('../handlers/vitals.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('health-records tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; table: string }> = [
    { limitType: 'maxAllergies', table: 'allergies' },
    { limitType: 'maxConditions', table: 'conditions' },
    { limitType: 'maxDocuments', table: 'medical_documents' },
    { limitType: 'maxImmunizations', table: 'immunizations' },
    { limitType: 'maxLabs', table: 'lab_results' },
    { limitType: 'maxMedications', table: 'medications' },
    { limitType: 'maxVitals', table: 'vitals' },
  ]

  for (const { limitType, table } of cases) {
    it(`gates ${table} create on ${limitType} (count ${table} by user_id)`, async () => {
      const c = cfg(limitType)
      expect(c, `${limitType} enforceLimit config should be registered`).toBeDefined()
      expect(c?.getLimit({ [limitType]: 5 })).toBe(5)
      db.count.mockClear()
      await c?.getCurrent('u1')
      expect(db.count).toHaveBeenCalledWith(table, [
        { field: 'user_id', operator: '=', value: 'u1' },
      ])
    })
  }
})
