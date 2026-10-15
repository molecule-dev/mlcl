import { beforeEach, describe, expect, it, vi } from 'vitest'

// reserveCredit MUST atomically check + debit the credit balance so two concurrent
// generations can't both pass a stale balance check and overspend. It serializes per
// user with a transaction-scoped advisory lock, then checks SUM(delta) and inserts the
// debit as one unit, in one withTransaction() — and writes nothing when the balance is
// insufficient.

// The queries reserveCredit runs inside its withTransaction().
const conn = { query: vi.fn() }
const db = {
  withTransaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  query: (...a: unknown[]) => conn.query(...a),
  withTransaction: (fn: () => Promise<unknown>) => db.withTransaction(fn),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-ai', () => ({ getProvider: vi.fn(), getProviderByName: vi.fn() }))
vi.mock('@molecule/api-ai-image-generation', () => ({ getProvider: vi.fn() }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: vi.fn(() => 'u1'),
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import { reserveCredit } from '../handlers/generations.js'

const calls = (): string[] => conn.query.mock.calls.map((c) => String(c[0]))

describe('ai-image-generator credit reservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reserves atomically when the balance is sufficient (lock → check → insert, one transaction)', async () => {
    conn.query
      .mockResolvedValueOnce({ rows: [], rowCount: null }) // advisory lock
      .mockResolvedValueOnce({ rows: [{ balance: 30 }], rowCount: 1 }) // SUM
      .mockResolvedValueOnce({ rows: [{ id: 'led-1' }], rowCount: 1 }) // INSERT ... RETURNING

    const r = await reserveCredit('u1', 10, 'generation')

    expect(r).toEqual({ ok: true, balance: 30, ledgerId: 'led-1' })
    expect(calls().some((q) => /pg_advisory_xact_lock/.test(q))).toBe(true)
    const insert = conn.query.mock.calls.find((c) => /INSERT INTO credit_ledger/.test(String(c[0])))
    expect(insert).toBeDefined()
    expect((insert?.[1] as unknown[])?.[1]).toBe(-10) // debits the cost (negative delta)
    expect(db.withTransaction).toHaveBeenCalledTimes(1)
  })

  it('rejects with NO debit when the balance is insufficient', async () => {
    conn.query
      .mockResolvedValueOnce({ rows: [], rowCount: null }) // advisory lock
      .mockResolvedValueOnce({ rows: [{ balance: 5 }], rowCount: 1 }) // SUM (< 10)

    const r = await reserveCredit('u1', 10, 'generation')

    expect(r.ok).toBe(false)
    expect(r.balance).toBe(5)
    expect(calls().some((q) => /INSERT INTO credit_ledger/.test(q))).toBe(false)
    expect(db.withTransaction).toHaveBeenCalledTimes(1)
  })
})
