import { findById } from '@molecule/api-database'
import type { OrderRow } from '@molecule/api-resource-order'
import { canDriveOrderLifecycle, setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

/**
 * Order merchant authorization for food-delivery.
 *
 * `@molecule/api-resource-order` fails CLOSED on every MERCHANT-only lifecycle
 * op (refund, a transition into a merchant state, cancelling an already-
 * progressed order): an order row records only the BUYER (`customer_id`), so the
 * package cannot know who the seller/merchant is and DENIES by default until the
 * app registers a merchant authorizer. This module supplies that knowledge for
 * food-delivery and wires the app's own order handlers through the same gate.
 *
 * **Merchant model:** an order is fulfilled by exactly one restaurant
 * (`orders.restaurant_id`). The MERCHANT entitled to drive an order's lifecycle
 * is that restaurant's OWNER — `restaurants.owner_id === userId`. This reuses
 * the app's existing owner mechanism (the same `owner_id` check the
 * `restaurants` and `menu` handlers already enforce on edit/delete via
 * `requireOwnedRestaurant`); it does NOT invent a parallel role system. A plain
 * buyer (the order owner) is therefore NOT a merchant and is denied. The
 * separate courier role (`is_courier` / `requireCourier`, the `/api/delivery/*`
 * board) drives only `picked_up`/`delivered` and is unaffected.
 *
 * @module
 */

/**
 * Order statuses whose ENTRY is a MERCHANT-driven (restaurant) lifecycle step.
 * Advancing an order into any of these via `PUT /orders/:id/status` requires the
 * merchant authorizer — a buyer must never self-service them. (`placed` is the
 * buyer's initial state; `picked_up` is driven by the courier board; `cancelled`
 * has its own endpoint. The buyer's only self-service lifecycle action is
 * cancelling their own still-`placed` order.)
 */
export const MERCHANT_ORDER_STATUSES = ['confirmed', 'preparing', 'ready', 'delivered'] as const

/**
 * Buyer-reachable transitions: maps an order's current status to the set of next
 * statuses the ORDER OWNER (buyer) may drive themselves. A buyer may only cancel
 * a still-`placed` order; every other lifecycle transition is merchant-only.
 * Mirrors the package's `BUYER_ALLOWED_TRANSITIONS` in this app's status
 * vocabulary (`placed` is the pending state). Any transition NOT listed here
 * requires the merchant authorizer.
 */
export const BUYER_ALLOWED_ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  placed: ['cancelled'],
  confirmed: [],
  preparing: [],
  ready: [],
  picked_up: [],
  delivered: [],
  cancelled: [],
}

/**
 * Register the order merchant authorizer at startup (call once from
 * `setupBonds`). The predicate answers "is `userId` the merchant entitled to
 * drive this order's lifecycle?" — true only when `userId` owns the order's
 * restaurant. Until this runs, the package denies every merchant op (403).
 */
export function registerOrderMerchantAuthorizer(): void {
  setOrderMerchantAuthorizer(async (orderRow: OrderRow, userId: string): Promise<boolean> => {
    if (!userId) return false
    // The food-delivery order row carries `restaurant_id` (not part of the
    // package's generic OrderRow type, hence the localized cast to read it).
    const restaurantId = (orderRow as unknown as { restaurant_id?: unknown }).restaurant_id
    if (!restaurantId) return false
    const restaurant = await findById<{ owner_id?: string }>('restaurants', String(restaurantId))
    return Boolean(restaurant && restaurant.owner_id === userId)
  })
}

/**
 * App-side merchant gate consulted by the food-delivery order handlers before a
 * merchant-only op. Routes through the package's default-DENY gate
 * (`canDriveOrderLifecycle`) so the fail-closed contract — 403 until an
 * authorizer is registered, and only when the authorizer approves the caller —
 * is honored from a single place.
 *
 * @param order - The food-delivery order row being acted on.
 * @param userId - The authenticated user ID requesting the merchant op.
 * @returns `true` if `userId` may drive this order's merchant lifecycle.
 */
export async function canMerchantManageOrder(
  order: Record<string, unknown>,
  userId: string,
): Promise<boolean> {
  // The app's order row is a superset of the package's generic OrderRow; the
  // gate only forwards it to the registered authorizer (which reads
  // `restaurant_id`), so this bridge between the two order schemas is safe.
  return canDriveOrderLifecycle(order as unknown as OrderRow, userId)
}
