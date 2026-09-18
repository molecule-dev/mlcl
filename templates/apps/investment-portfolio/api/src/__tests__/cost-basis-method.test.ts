import { beforeEach, describe, expect, it, vi } from 'vitest'

// Cost basis on a sale was always weighted-average, so the Settings tax_method
// (FIFO/LIFO/SpecID) was persisted but never affected any holding's
// cost_basis_cents / pnl. rebuildHoldingFromTransactions now relieves lots per
// the stored method: FIFO the oldest lot first, LIFO the newest.

let taxMethod = 'FIFO'
const db = {
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(async (...args: unknown[]) => {
    const table = args[0]
    if (table === 'user_settings') return { tax_method: taxMethod }
    if (table === 'assets')
      return { symbol: 'AAPL', name: 'Apple', asset_class: 'equity', last_price_cents: 5000 }
    return null // holdings: none yet
  }),
  create: vi.fn(async (..._a: unknown[]) => ({ data: { id: 'h1' } })),
  updateById: vi.fn(async (..._a: unknown[]) => ({ data: {} })),
  deleteById: vi.fn(async (..._a: unknown[]) => ({ data: {} })),
  findById: vi.fn(async (..._a: unknown[]) => null),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => '',
}))
vi.mock('@molecule/api-i18n', () => ({ t: (k: string) => k }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: unknown, _s: unknown, n: () => void) => n(),
}))

const { rebuildHoldingFromTransactions } = await import('../handlers/transactions.js')

// Buy 10 @ $10 (lot A, $100), then buy 10 @ $30 (lot B, $300), then sell 10.
const TXS = [
  { kind: 'buy', shares: 10, total_cents: 10000, occurred_at: '2025-01-01' },
  { kind: 'buy', shares: 10, total_cents: 30000, occurred_at: '2025-02-01' },
  { kind: 'sell', shares: 10, total_cents: 20000, occurred_at: '2025-03-01' },
]
const costBasisWritten = (): number => {
  const call = db.create.mock.calls.find((c) => c[0] === 'holdings')
  return (call?.[1] as { cost_basis_cents?: number })?.cost_basis_cents ?? -1
}
const run = async (method: string): Promise<number> => {
  taxMethod = method
  db.findMany.mockResolvedValue(TXS)
  await rebuildHoldingFromTransactions('u1', 'AAPL')
  return costBasisWritten()
}

beforeEach(() => vi.clearAllMocks())

describe('rebuildHoldingFromTransactions relieves lots by tax_method', () => {
  it('FIFO keeps the newest (dearer) lot — cost basis $300', async () => {
    expect(await run('FIFO')).toBe(30000)
  })

  it('LIFO keeps the oldest (cheaper) lot — cost basis $100', async () => {
    expect(await run('LIFO')).toBe(10000)
  })

  it('SpecID (no per-lot picker) defaults to FIFO — cost basis $300', async () => {
    expect(await run('SpecID')).toBe(30000)
  })
})
