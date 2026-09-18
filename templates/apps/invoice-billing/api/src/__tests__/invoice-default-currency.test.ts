import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// currency is a saved user preference (users.oauthData.preferences.currency, default "USD").
// Invoice + recurring create hardcoded "USD", so the saved "Default currency" did nothing.
// Create now resolves it from the preference (an explicit body currency still wins).

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
import recurringRouter from '../handlers/recurring.js'

function postHandler(router: unknown): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router as {
      stack: Array<{
        route?: {
          path: string
          methods: Record<string, boolean>
          stack: Array<{ handle: unknown }>
        }
      }>
    }
  ).stack.find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response

function mockUser(currency: string | undefined) {
  db.findById.mockImplementation((table: string) => {
    if (table === 'clients') return Promise.resolve({ id: 'c1', user_id: 'user-1', name: 'Acme' })
    if (table === 'users')
      return Promise.resolve({
        id: 'user-1',
        oauthData: currency === undefined ? {} : { preferences: { currency } },
      })
    return Promise.resolve(null)
  })
}
async function currencyFor(
  router: unknown,
  table: string,
  savedCurrency: string | undefined,
  bodyCurrency?: string,
): Promise<string> {
  mockUser(savedCurrency)
  const body: Record<string, unknown> = {
    client_id: 'c1',
    items: [{ description: 'Work', quantity: 1, unit_price: 100 }],
  }
  if (bodyCurrency) body.currency = bodyCurrency
  await postHandler(router)({ body } as unknown as Request, makeRes())
  const call = db.create.mock.calls.find((c) => c[0] === table)
  return (call?.[1] as { currency: string }).currency
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'inv-1' } })
})

describe('invoice + recurring currency honors the saved default', () => {
  it('invoice create uses the stored preferences.currency when the body omits one', async () => {
    expect(await currencyFor(invoicesRouter, 'invoices', 'EUR')).toBe('EUR')
  })

  it('invoice create defaults to USD when no preference is set', async () => {
    expect(await currencyFor(invoicesRouter, 'invoices', undefined)).toBe('USD')
  })

  it('invoice create honors an explicit body currency over the preference', async () => {
    expect(await currencyFor(invoicesRouter, 'invoices', 'EUR', 'GBP')).toBe('GBP')
  })

  it('recurring create uses the stored preferences.currency when the body omits one', async () => {
    expect(await currencyFor(recurringRouter, 'recurring_invoices', 'JPY')).toBe('JPY')
  })
})
