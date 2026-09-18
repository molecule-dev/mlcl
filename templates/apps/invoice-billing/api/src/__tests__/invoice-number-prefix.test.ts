import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The invoice-number prefix is a saved user preference (Settings → "Invoice prefix",
// users.oauthData.preferences.invoicePrefix). Invoice creation hardcoded "INV-", so changing the
// setting did nothing. Generated numbers must use the stored prefix, falling back to "INV-".

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

/** Run create-invoice with a given stored prefix (undefined = preference unset). */
async function numberFor(invoicePrefix: string | undefined): Promise<string> {
  db.findById.mockImplementation((table: string) => {
    if (table === 'clients') {
      return Promise.resolve({ id: 'c1', user_id: 'user-1', name: 'Acme', company: 'Acme Inc' })
    }
    if (table === 'users') {
      return Promise.resolve({
        id: 'user-1',
        oauthData: invoicePrefix === undefined ? {} : { preferences: { invoicePrefix } },
      })
    }
    return Promise.resolve(null)
  })
  const body = { client_id: 'c1', items: [{ description: 'Work', quantity: 1, unit_price: 100 }] }
  await createHandler()({ body } as unknown as Request, makeRes())
  const call = db.create.mock.calls.find((c) => c[0] === 'invoices')
  return String((call?.[1] as { invoice_number: string }).invoice_number)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'inv-1' } })
})

describe('invoice number honors the saved prefix', () => {
  it("uses the user's stored invoicePrefix", async () => {
    expect(await numberFor('ACME-')).toMatch(/^ACME-\d+$/)
  })

  it('falls back to INV- when no prefix is set', async () => {
    expect(await numberFor(undefined)).toMatch(/^INV-\d+$/)
  })

  it('falls back to INV- for an empty prefix', async () => {
    expect(await numberFor('')).toMatch(/^INV-\d+$/)
  })
})
