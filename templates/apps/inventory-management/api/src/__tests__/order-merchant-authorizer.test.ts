import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  canDriveOrderLifecycle,
  getOrderMerchantAuthorizer,
  type OrderRow,
  setOrderMerchantAuthorizer,
} from '@molecule/api-resource-order'

import { setupResourceOrder } from '../bonds/resource-order.js'

// The inventory manager who owns (created) the order — i.e. the warehouse
// operator / MERCHANT entitled to drive its lifecycle in this single-tenant app.
const OWNER = '11111111-1111-1111-1111-111111111111'
// A different account: a non-owner. In the order package's vocabulary this is
// the "buyer" — the party that must NOT be able to self-service merchant ops.
const OTHER = '22222222-2222-2222-2222-222222222222'

function makeOrder(userId: string): OrderRow {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    userId,
    status: 'shipped', // a MERCHANT state — refund / progressed-cancel territory
    subtotal: 1000,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 1000,
    shippingAddress: null,
    billingAddress: null,
    paymentId: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('order merchant authorizer (inventory-management: owner === merchant)', () => {
  // Reset the package-level singleton around every test so the fail-closed
  // default is observable and tests don't leak registration into each other.
  beforeEach(() => {
    setOrderMerchantAuthorizer(null)
  })
  afterEach(() => {
    setOrderMerchantAuthorizer(null)
  })

  it('fails closed before any authorizer is registered — every merchant op is denied (403)', async () => {
    expect(getOrderMerchantAuthorizer()).toBeNull()
    // Even the owner is denied while nothing is registered: the package default
    // is deny, so a merchant op would 403 with order.error.merchantForbidden.
    expect(await canDriveOrderLifecycle(makeOrder(OWNER), OWNER)).toBe(false)
    expect(await canDriveOrderLifecycle(makeOrder(OWNER), OTHER)).toBe(false)
  })

  it('registers a merchant authorizer at startup via setupResourceOrder()', () => {
    expect(getOrderMerchantAuthorizer()).toBeNull()
    setupResourceOrder()
    expect(getOrderMerchantAuthorizer()).not.toBeNull()
  })

  it('MERCHANT can: the order-owning operator may drive the lifecycle (refund/ship/deliver)', async () => {
    setupResourceOrder()
    expect(await canDriveOrderLifecycle(makeOrder(OWNER), OWNER)).toBe(true)
  })

  it('BUYER cannot: a non-owner account is 403-denied on merchant ops', async () => {
    setupResourceOrder()
    // The order belongs to OWNER; OTHER is not the merchant for it.
    expect(await canDriveOrderLifecycle(makeOrder(OWNER), OTHER)).toBe(false)
    // ...and symmetrically, OWNER is not the merchant for OTHER's order.
    expect(await canDriveOrderLifecycle(makeOrder(OTHER), OWNER)).toBe(false)
  })
})
