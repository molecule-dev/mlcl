/**
 * Regression test for the L2-1 TOCTOU double-spend / overdraft fix in the
 * banking-dashboard `POST /transfers` handler.
 *
 * Before the fix the handler did a non-atomic read-check-write: `findById` the
 * source account, compare `available_cents < amount_cents` in JS, then
 * `updateById` with an ABSOLUTE balance computed from the stale read. Two
 * concurrent full-balance debits both read the same starting balance, both
 * passed the JS guard, and both wrote the source to an absolute 0 while the
 * destination was credited twice — value created from nothing.
 *
 * The fix runs the debit + credit + ledger inserts inside ONE DB transaction
 * and performs the debit as a single CONDITIONAL UPDATE
 * (`... WHERE available_cents >= $amt`) that affects 0 rows when funds are
 * insufficient. This test drives the handler through a fake DB connection whose
 * `UPDATE ... WHERE available_cents >= $amt` mutates a shared in-memory balance
 * atomically, and asserts:
 *   1. a legitimate transfer succeeds and moves money once, and
 *   2. two concurrent full-balance debits result in exactly one success +
 *      one 400 insufficient-funds, with the source never driven negative and
 *      the destination credited only once.
 *
 * Mirrors the ephemeral-http-server + global-fetch style of the other handler
 * tests in this fleet (no supertest).
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Account {
  id: string
  user_id: string
  balance_cents: number
  available_cents: number
}

const state = vi.hoisted(() => ({
  accounts: new Map<
    string,
    { id: string; user_id: string; balance_cents: number; available_cents: number }
  >(),
  queries: [] as string[],
  transferSeq: 0,
}))

const dbMock = vi.hoisted(() => ({
  count: vi.fn() as ReturnType<typeof vi.fn>,
  create: vi.fn() as ReturnType<typeof vi.fn>,
  findById: vi.fn() as ReturnType<typeof vi.fn>,
  findMany: vi.fn() as ReturnType<typeof vi.fn>,
  connect: vi.fn() as ReturnType<typeof vi.fn>,
}))

vi.mock('@molecule/api-database', () => dbMock)
vi.mock('@molecule/api-i18n', () => ({
  t: (k: string, _v?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? k,
}))
vi.mock('@molecule/api-audit', () => ({ log: vi.fn(async () => undefined) }))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => undefined) }))
vi.mock('@molecule/api-entitlements', () => ({
  // Pass-through middleware — the limit gate is irrelevant to the race test.
  enforceLimit: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  // Pass-through — payloads in this test are already well-formed.
  validateBody: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: express.Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: express.Request, name = 'id') => {
    const v = req.params[name]
    return Array.isArray(v) ? v[0] : v
  },
}))

/**
 * Build a fake DatabaseConnection that enforces the conditional atomic debit
 * against the shared in-memory account balances. The check-and-mutate inside
 * each `query` call is synchronous, so it is atomic with respect to the JS
 * event loop — exactly like a real row-level `UPDATE ... WHERE available >= $`.
 */
function makeConnection() {
  return {
    async query(text: string, values?: unknown[]) {
      state.queries.push(text)
      const sql = text.trim()
      if (/^(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) {
        return { rows: [], rowCount: 0 }
      }
      if (/^UPDATE bank_accounts/i.test(sql) && /available_cents >= \$1/i.test(sql)) {
        // Atomic conditional debit.
        const amount = Number(values?.[0])
        const id = String(values?.[1])
        const uid = String(values?.[2])
        const acct = state.accounts.get(id)
        if (!acct || acct.user_id !== uid || acct.available_cents < amount) {
          return { rows: [], rowCount: 0 }
        }
        acct.balance_cents -= amount
        acct.available_cents -= amount
        return {
          rows: [{ balance_cents: acct.balance_cents, available_cents: acct.available_cents }],
          rowCount: 1,
        }
      }
      if (/^UPDATE bank_accounts/i.test(sql)) {
        // Credit (expression-based add).
        const amount = Number(values?.[0])
        const id = String(values?.[1])
        const uid = String(values?.[2])
        const acct = state.accounts.get(id)
        if (!acct || acct.user_id !== uid) {
          return { rows: [], rowCount: 0 }
        }
        acct.balance_cents += amount
        acct.available_cents += amount
        return { rows: [{ available_cents: acct.available_cents }], rowCount: 1 }
      }
      if (/^INSERT INTO transfers/i.test(sql)) {
        state.transferSeq += 1
        return { rows: [{ id: `tr_${String(state.transferSeq)}` }], rowCount: 1 }
      }
      if (/^INSERT INTO bank_transactions/i.test(sql)) {
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
    release: vi.fn(),
  }
}

let server: http.Server | null = null
async function listen(router: express.Router, userId: string | null): Promise<string> {
  const app = express()
  app.use(express.json())
  app.use((_req, res: express.Response, next) => {
    if (userId) res.locals.session = { userId, email: 'u@example.com' }
    next()
  })
  app.use(router)
  server = http.createServer(app)
  await new Promise<void>((resolve) => server?.listen(0, resolve))
  const addr = server?.address() as AddressInfo
  return `http://127.0.0.1:${String(addr.port)}`
}

function seedAccount(a: Account) {
  state.accounts.set(a.id, { ...a })
}

beforeEach(() => {
  vi.clearAllMocks()
  state.accounts.clear()
  state.queries = []
  state.transferSeq = 0
  // findById('bank_accounts', id) reflects current in-memory state.
  dbMock.findById.mockImplementation(async (table: string, id: string) => {
    if (table === 'bank_accounts') return state.accounts.get(id) ?? null
    return null
  })
  dbMock.findMany.mockImplementation(async () => [])
  dbMock.count.mockImplementation(async () => 0)
  dbMock.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => ({
    data: { id: 'scheduled_1', ...data },
    affected: 1,
  }))
  dbMock.connect.mockImplementation(async () => makeConnection())
})

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (!server) return resolve()
    server.close(() => resolve())
  })
  server = null
})

describe('POST /transfers — atomic ledger (L2-1)', () => {
  it('completes a legitimate transfer and moves money exactly once', async () => {
    seedAccount({ id: 'A', user_id: 'u1', balance_cents: 10000, available_cents: 10000 })
    seedAccount({ id: 'B', user_id: 'u1', balance_cents: 0, available_cents: 0 })
    const router = (await import('../handlers/transfers.js')).default
    const url = await listen(router, 'u1')

    const res = await fetch(`${url}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from_account_id: 'A', to_account_id: 'B', amount_cents: 5000 }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { id?: string }
    expect(body.id).toBe('tr_1')
    expect(state.accounts.get('A')?.available_cents).toBe(5000)
    expect(state.accounts.get('B')?.available_cents).toBe(5000)
    // The fix MUST go through the conditional atomic debit, not a stale-read
    // absolute updateById. If the handler reverts to updateById, connect() is
    // never called and no such guarded query is recorded.
    expect(state.queries.some((q) => /available_cents >= \$1/i.test(q))).toBe(true)
  })

  it('rejects an oversize debit with 400 and never moves money', async () => {
    seedAccount({ id: 'A', user_id: 'u1', balance_cents: 100, available_cents: 100 })
    seedAccount({ id: 'B', user_id: 'u1', balance_cents: 0, available_cents: 0 })
    const router = (await import('../handlers/transfers.js')).default
    const url = await listen(router, 'u1')

    const res = await fetch(`${url}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from_account_id: 'A', to_account_id: 'B', amount_cents: 500 }),
    })

    expect(res.status).toBe(400)
    expect(state.accounts.get('A')?.available_cents).toBe(100)
    expect(state.accounts.get('B')?.available_cents).toBe(0)
  })

  it('blocks the concurrent double-spend: two full-balance debits → one 201, one 400', async () => {
    seedAccount({ id: 'A', user_id: 'u1', balance_cents: 100, available_cents: 100 })
    seedAccount({ id: 'B', user_id: 'u1', balance_cents: 0, available_cents: 0 })
    const router = (await import('../handlers/transfers.js')).default
    const url = await listen(router, 'u1')

    const fire = () =>
      fetch(`${url}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from_account_id: 'A', to_account_id: 'B', amount_cents: 100 }),
      })

    const [r1, r2] = await Promise.all([fire(), fire()])
    const statuses = [r1.status, r2.status].sort()

    // Exactly one succeeds; the other is rejected for insufficient funds.
    expect(statuses).toEqual([201, 400])
    // The source is debited once and NEVER driven negative (no overdraft).
    expect(state.accounts.get('A')?.available_cents).toBe(0)
    // The destination is credited exactly once (+100), not twice (+200).
    expect(state.accounts.get('B')?.available_cents).toBe(100)
  })
})
