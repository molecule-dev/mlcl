import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// defaultDueDays is a saved user preference (users.oauthData.preferences.defaultDueDays, default 14).
// Invoice creation stored due_date=null when the client omitted one, so the saved payment term did
// nothing. Create now computes due_date = created_at + defaultDueDays when no explicit date is given.

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({ messageId: 'x' }) }))
vi.mock('../handlers/_decorate.js', () => ({
  decoratePayment: (x: unknown) => x,
  decorateInvoice: (x: unknown) => x,
}))
vi.mock('../handlers/_seed.js', () => ({ ensureDemoSeeded: vi.fn().mockResolvedValue(undefined) }))

import invoicesRouter from '../handlers/invoices.js'

function createHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    invoicesRouter.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const DAY = 86_400_000

async function dueDateFor(defaultDueDays: number | undefined, explicitDue?: string): Promise<Date> {
  db.findById.mockImplementation((table: string) => {
    if (table === 'clients') return Promise.resolve({ id: 'c1', user_id: 'user-1', name: 'Acme' })
    if (table === 'users')
      return Promise.resolve({
        id: 'user-1',
        oauthData: defaultDueDays === undefined ? {} : { preferences: { defaultDueDays } },
      })
    return Promise.resolve(null)
  })
  const body: Record<string, unknown> = {
    client_id: 'c1',
    items: [{ description: 'Work', quantity: 1, unit_price: 100 }],
  }
  if (explicitDue) body.due_date = explicitDue
  await createHandler()({ body } as unknown as Request, makeRes())
  const call = db.create.mock.calls.find((c) => c[0] === 'invoices')
  return (call?.[1] as { due_date: Date }).due_date
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'inv-1' } })
})

describe('invoice due_date honors the saved defaultDueDays', () => {
  it('computes due_date = now + stored defaultDueDays when none is given', async () => {
    const before = Date.now()
    const due = await dueDateFor(30)
    expect(due).toBeInstanceOf(Date)
    expect(due.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY - 2000)
    expect(due.getTime()).toBeLessThanOrEqual(Date.now() + 30 * DAY + 2000)
  })

  it('defaults to 14 days when no preference is set', async () => {
    const before = Date.now()
    const due = await dueDateFor(undefined)
    expect(due.getTime()).toBeGreaterThanOrEqual(before + 14 * DAY - 2000)
    expect(due.getTime()).toBeLessThanOrEqual(Date.now() + 14 * DAY + 2000)
  })

  it('uses an explicit due_date when the client provides one', async () => {
    const due = await dueDateFor(30, '2030-01-15T00:00:00.000Z')
    expect(due.toISOString()).toBe('2030-01-15T00:00:00.000Z')
  })
})
