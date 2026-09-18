import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the operator via the ADMIN_EMAILS allow-list,
// read at module-evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'owner@grocer.com'

const findById = vi.fn()
const updateById = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  create: vi.fn(),
  findMany: vi.fn(),
}))

// i18n stub returns the English defaultValue so assertions stay readable.
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Importing the delivery-slots handler module (for `batchCreateSchema`) pulls in
// these bonds at module-eval time — stub them so the import has no side effects.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: vi.fn(),
  getUserId: vi.fn(),
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

type MockRes = Response & {
  statusCode?: number
  body?: unknown
}

const makeRes = (session?: { userId?: string }): MockRes => {
  const res = {
    locals: { session },
  } as unknown as MockRes
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as Response['status']
  res.json = vi.fn((payload: unknown) => {
    res.body = payload
    return res
  }) as unknown as Response['json']
  return res
}

describe('requireAdmin middleware (P2H-4: global delivery-slot / catalogue writes)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when there is no authenticated session', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    const res = makeRes(undefined)
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(findById).not.toHaveBeenCalled()
  })

  it('returns 403 for an authenticated non-admin shopper (the exploit path)', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-1', email: 'shopper@example.com', role: 'customer' })
    const res = makeRes({ userId: 'user-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(updateById).not.toHaveBeenCalled()
  })

  it('calls next() for a user whose role is already admin', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-2', email: 'someone@example.com', role: 'admin' })
    const res = makeRes({ userId: 'user-2' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('promotes and admits a user on the ADMIN_EMAILS allow-list', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'owner-1', email: 'Owner@Grocer.com', role: 'customer' })
    updateById.mockResolvedValue({ data: {} })
    const res = makeRes({ userId: 'owner-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(updateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when the session user no longer exists', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue(null)
    const res = makeRes({ userId: 'ghost' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('delivery-slots batch range bound (P2H-4: unbounded-insert DoS)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // These exercise the *shipped* batchCreateSchema exported from the handler,
  // so the regression is pinned to the real validation rule.
  it('rejects a batch whose day-span * windows exceeds the slot cap', async () => {
    const { batchCreateSchema } = await import('../handlers/delivery-slots.js')
    // 3 years * 4 windows = ~4,384 slots — must be rejected.
    const result = batchCreateSchema.safeParse({
      start_date: '2026-01-01',
      end_date: '2029-01-01',
      windows: [
        { start: '08:00', end: '10:00' },
        { start: '10:00', end: '12:00' },
        { start: '12:00', end: '14:00' },
        { start: '14:00', end: '16:00' },
      ],
      capacity: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a batch whose end_date precedes start_date', async () => {
    const { batchCreateSchema } = await import('../handlers/delivery-slots.js')
    const result = batchCreateSchema.safeParse({
      start_date: '2026-02-01',
      end_date: '2026-01-01',
      windows: [{ start: '08:00', end: '10:00' }],
      capacity: 10,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a reasonable single-week, single-window batch', async () => {
    const { batchCreateSchema } = await import('../handlers/delivery-slots.js')
    const result = batchCreateSchema.safeParse({
      start_date: '2026-01-01',
      end_date: '2026-01-07',
      windows: [{ start: '08:00', end: '10:00' }],
      capacity: 10,
    })
    expect(result.success).toBe(true)
  })
})
