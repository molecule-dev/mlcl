/**
 * [M6-1] Order merchant authorizer wiring.
 *
 * `@molecule/api-resource-order` fails closed on merchant lifecycle ops (refund,
 * a merchant-state `updateStatus`, cancelling an already-progressed order): each
 * returns 403 (`order.error.merchantForbidden`) until the app registers a
 * merchant authorizer. This store is a Gumroad-style creator marketplace — the
 * merchant/seller is the product CREATOR (`products.creator_id`), NEVER the buyer
 * (who is the order owner). These tests exercise the REAL package gate
 * (`canDriveOrderLifecycle`) against the REAL authorizer registered by
 * `setupResourceOrder()`, proving:
 *   - a seller (creator of the order's product) CAN drive the lifecycle,
 *   - a plain buyer (the order owner, non-creator) CANNOT (→ 403),
 *   - an unrelated user CANNOT,
 *   - with no authorizer registered the gate denies by default.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SELLER = 'seller-1'
const BUYER = 'buyer-1'
const PRODUCT = 'prod-1'
const ORDER = 'order-1'

vi.mock('@molecule/api-database', () => ({
  findMany: vi.fn(async (table: string) => {
    if (table === 'order_items') return [{ productId: PRODUCT }]
    if (table === 'products') return [{ id: PRODUCT, creator_id: SELLER }]
    return []
  }),
  findById: vi.fn(async () => null),
}))

// The order-resource barrel pulls in i18n + logger at import time.
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
  registerLocaleModule: vi.fn(),
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import {
  canDriveOrderLifecycle,
  getOrderMerchantAuthorizer,
  type OrderRow,
  setOrderMerchantAuthorizer,
} from '@molecule/api-resource-order'

import { setupResourceOrder } from '../bonds/resource-order.js'

const ORDER_ROW: OrderRow = {
  id: ORDER,
  userId: BUYER, // the order owner is the BUYER, not the seller
  status: 'shipped', // a merchant state — buyer can never drive this
  subtotal: 20,
  tax: 0,
  shipping: 0,
  discount: 0,
  total: 20,
  shippingAddress: null,
  billingAddress: null,
  paymentId: null,
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('[M6-1] order merchant authorizer (seller = product creator)', () => {
  beforeEach(() => {
    setupResourceOrder()
  })
  afterEach(() => {
    setOrderMerchantAuthorizer(null)
  })

  it('registers a merchant authorizer (no longer default-deny)', () => {
    expect(getOrderMerchantAuthorizer()).toBeTypeOf('function')
  })

  it('authorizes the SELLER who created the order product — merchant-can', async () => {
    expect(await canDriveOrderLifecycle(ORDER_ROW, SELLER)).toBe(true)
  })

  it('denies a plain BUYER (order owner, non-creator) — buyer-cannot', async () => {
    expect(await canDriveOrderLifecycle(ORDER_ROW, BUYER)).toBe(false)
  })

  it('denies an unrelated user', async () => {
    expect(await canDriveOrderLifecycle(ORDER_ROW, 'someone-else')).toBe(false)
  })

  it('defaults to DENY when no authorizer is registered', async () => {
    setOrderMerchantAuthorizer(null)
    expect(await canDriveOrderLifecycle(ORDER_ROW, SELLER)).toBe(false)
  })
})
