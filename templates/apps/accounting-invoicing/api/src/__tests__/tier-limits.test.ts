import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// maxAccounts / maxExpenses / maxInvoices are defined in tiers.ts and advertised on Pricing (CATALOG
// claims them gated), but POST /accounts, POST /expenses, and POST /invoices never called
// enforceLimit, so any tier could create unlimited. Each create route now gates on its limit,
// counting the owning table by user_id.

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
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
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
vi.mock('../lib/serialize.js', () => ({
  serializeAccount: (r: unknown) => r,
  serializeExpense: (r: unknown) => r,
  serializeInvoice: (r: unknown) => r,
}))
vi.mock('../lib/invoice-totals.js', () => ({ resolveInvoiceTotals: vi.fn(() => ({})) }))

// Importing each router registers its enforceLimit config.
await import('../handlers/accounts.js')
await import('../handlers/expenses.js')
await import('../handlers/invoices.js')

const cfg = (limitType: string): LimitConfig | undefined =>
  configs.find((c) => c.limitType === limitType)

beforeEach(() => vi.clearAllMocks())

describe('accounting-invoicing tier limits are enforced on create', () => {
  const cases: Array<{ limitType: string; table: string }> = [
    { limitType: 'maxAccounts', table: 'accounts' },
    { limitType: 'maxExpenses', table: 'expenses' },
    { limitType: 'maxInvoices', table: 'invoices' },
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
