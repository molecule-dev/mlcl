import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates vetted couriers via the COURIER_EMAILS allow-list,
// read at module-evaluation time — set it before the SUT is imported.
process.env.COURIER_EMAILS = 'driver@fleet.com'

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

// Importing the delivery handler module (for `toCourierOffer`) pulls in these
// bonds at module-eval time — stub them so the import has no side effects.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: vi.fn(),
  getUserId: vi.fn(),
}))

vi.mock('@molecule/api-geolocation', () => ({
  distance: vi.fn(() => 0),
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

describe('requireCourier middleware (TPL-001: courier-board access control)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when there is no authenticated session', async () => {
    const { requireCourier } = await import('../middleware/require-courier.js')
    const res = makeRes(undefined)
    const next = vi.fn() as unknown as NextFunction

    await requireCourier({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(findById).not.toHaveBeenCalled()
  })

  it('returns 403 for an authenticated non-courier shopper (the exploit path)', async () => {
    const { requireCourier } = await import('../middleware/require-courier.js')
    findById.mockResolvedValue({ id: 'user-1', email: 'shopper@example.com', is_courier: false })
    const res = makeRes({ userId: 'user-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireCourier({} as Request, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(updateById).not.toHaveBeenCalled()
  })

  it('calls next() for a user already flagged is_courier', async () => {
    const { requireCourier } = await import('../middleware/require-courier.js')
    findById.mockResolvedValue({ id: 'user-2', email: 'someone@example.com', is_courier: true })
    const res = makeRes({ userId: 'user-2' })
    const next = vi.fn() as unknown as NextFunction

    await requireCourier({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('promotes and admits a user on the COURIER_EMAILS allow-list', async () => {
    const { requireCourier } = await import('../middleware/require-courier.js')
    findById.mockResolvedValue({ id: 'driver-1', email: 'Driver@Fleet.com', is_courier: false })
    updateById.mockResolvedValue({ data: {} })
    const res = makeRes({ userId: 'driver-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireCourier({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(updateById).toHaveBeenCalledWith('users', 'driver-1', { is_courier: true })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when the session user no longer exists', async () => {
    const { requireCourier } = await import('../middleware/require-courier.js')
    findById.mockResolvedValue(null)
    const res = makeRes({ userId: 'ghost' })
    const next = vi.fn() as unknown as NextFunction

    await requireCourier({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('toCourierOffer (TPL-001: available-board PII minimization)', () => {
  it('omits the exact delivery address and precise coordinates', async () => {
    const { toCourierOffer } = await import('../handlers/delivery.js')
    const offer = toCourierOffer({
      id: 'order-1',
      customer_id: 'cust-1',
      restaurant_id: 'rest-1',
      status: 'ready',
      delivery_fee: 599,
      currency: 'USD',
      distance_km: 3.2,
      created_at: '2026-06-19T00:00:00Z',
      // PII that MUST NOT reach the open courier board:
      delivery_address: '742 Evergreen Terrace, Springfield',
      delivery_lat: 37.42199,
      delivery_lng: -122.08405,
      special_instructions: 'gate code 1234',
      payment_intent_id: 'pi_secret',
    })

    expect(offer).not.toHaveProperty('delivery_address')
    expect(offer).not.toHaveProperty('delivery_lat')
    expect(offer).not.toHaveProperty('delivery_lng')
    expect(offer).not.toHaveProperty('special_instructions')
    expect(offer).not.toHaveProperty('payment_intent_id')
    expect(offer).not.toHaveProperty('customer_id')

    // Coarse region only — rounded to ~0.1 degrees, not the exact coordinates.
    expect(offer.delivery_region_lat).toBe(37.4)
    expect(offer.delivery_region_lng).toBe(-122.1)

    // Decision-relevant fields a courier DOES need are retained.
    expect(offer.id).toBe('order-1')
    expect(offer.restaurant_id).toBe('rest-1')
    expect(offer.delivery_fee).toBe(599)
    expect(offer.distance_km).toBe(3.2)
  })

  it('handles a missing drop-off coordinate without leaking', async () => {
    const { toCourierOffer } = await import('../handlers/delivery.js')
    const offer = toCourierOffer({
      id: 'order-2',
      restaurant_id: 'rest-2',
      status: 'ready',
      delivery_lat: null,
      delivery_lng: null,
    })
    expect(offer.delivery_region_lat).toBeNull()
    expect(offer.delivery_region_lng).toBeNull()
    expect(offer).not.toHaveProperty('delivery_address')
  })
})
