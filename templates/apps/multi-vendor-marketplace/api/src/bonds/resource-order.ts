/**
 * Registers the order-resource MERCHANT authorizer.
 *
 * `@molecule/api-resource-order` fails CLOSED on every merchant lifecycle op
 * (refund, a merchant-state status transition, and cancelling an
 * already-progressed order): until an app registers a merchant authorizer those
 * ops return 403. An order row records only the BUYER (`userId`), so the package
 * cannot know who the seller/merchant is — this app must supply that knowledge.
 *
 * In this multi-vendor marketplace the merchant for an order is the SELLER who
 * owns the order's items: each `order_items` row carries `vendor_id`, and each
 * `vendors` row is owned by a user (`vendors.user_id`). A caller is therefore a
 * merchant for an order iff they own one of the vendor storefronts responsible
 * for that order's items (the order's own `vendor_id` column is used as a
 * fallback — checkout splits the cart into one order per vendor).
 *
 * @module
 */

import { findById, findMany } from '@molecule/api-database'
import type { OrderMerchantAuthorizer } from '@molecule/api-resource-order'
import { setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

/**
 * Resolves the distinct vendor ids responsible for an order: the vendors of its
 * line items, plus the order's own `vendor_id` (this app stores one vendor per
 * order). Self-contained so it can be reused by any merchant-gated handler.
 */
async function vendorIdsForOrder(orderId: string): Promise<Set<string>> {
  const vendorIds = new Set<string>()
  const items = await findMany<Record<string, unknown>>('order_items', {
    where: [{ field: 'order_id', operator: '=', value: orderId }],
  })
  for (const item of items) {
    if (item.vendor_id) vendorIds.add(String(item.vendor_id))
  }
  const order = await findById<Record<string, unknown>>('orders', orderId)
  if (order?.vendor_id) vendorIds.add(String(order.vendor_id))
  return vendorIds
}

/**
 * The merchant predicate: a user may drive an order's merchant lifecycle iff
 * they own one of the vendor storefronts responsible for that order's items.
 * Deliberately distinct from the buyer ownership check (`order.buyer_id ===
 * userId`) — the buyer must NEVER be able to self-service the merchant
 * lifecycle on their own order.
 */
export const orderMerchantAuthorizer: OrderMerchantAuthorizer = async (orderRow, userId) => {
  const orderId = orderRow?.id
  if (!orderId || !userId) return false
  const vendorIds = await vendorIdsForOrder(orderId)
  if (vendorIds.size === 0) return false
  for (const vendorId of vendorIds) {
    const vendor = await findById<Record<string, unknown>>('vendors', vendorId)
    if (vendor && String(vendor.user_id) === userId) return true
  }
  return false
}

/**
 * Registers {@link orderMerchantAuthorizer} with `@molecule/api-resource-order`.
 * Call once at startup (from `setupBonds`). Without it, every order merchant op
 * fails closed with a 403.
 */
export function setupResourceOrder(): void {
  setOrderMerchantAuthorizer(orderMerchantAuthorizer)
}
