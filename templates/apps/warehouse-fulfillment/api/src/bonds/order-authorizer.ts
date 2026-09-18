/**
 * Order merchant authorizer for the Warehouse Fulfillment app.
 *
 * `@molecule/api-resource-order` FAILS CLOSED on every MERCHANT lifecycle op:
 * refunding (`POST /orders/:id/refund`), transitioning INTO a merchant state
 * (`PUT /orders/:id/status` → confirmed/processing/shipped/delivered/refunded),
 * and cancelling an already-progressed order (`POST /orders/:id/cancel` when
 * `status !== 'pending'`). Each returns 403 `order.error.merchantForbidden`
 * until the consuming app registers a merchant authorizer answering "is this
 * caller a merchant entitled to drive this order's lifecycle?".
 *
 * MERCHANT MODEL FOR THIS APP (single-merchant warehouse):
 * Warehouse Fulfillment is single-tenant — every authenticated user is a
 * warehouse operator (staff/owner), and an order's `userId` records the
 * OPERATOR who manages that order, NOT the buyer. The external buyer is
 * captured only as `customerName` / `customerEmail` (see the `orders` table)
 * and is never a platform user. So the merchant entitled to ship/deliver/refund
 * (or cancel a progressed order) is exactly the operator who owns the order.
 * This intentionally REUSES the app's existing userId-ownership model — every
 * domain resource here is userId-scoped — rather than inventing a parallel role
 * table: there is no separate "buyer" user to defend against, only other
 * operators, who are correctly denied.
 *
 * @module
 */

import { type OrderRow, setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

/**
 * Merchant predicate: a user may drive an order's merchant lifecycle iff they
 * are the warehouse operator who owns it. Because this app's `orders.userId` is
 * the operator (merchant) — not the buyer — this is the merchant check, not a
 * buyer ownership check.
 *
 * @param orderRow - The order being acted on.
 * @param userId - The authenticated user ID requesting the merchant op.
 * @returns `true` when the caller is the owning operator, otherwise `false`.
 */
export function isOrderMerchant(orderRow: OrderRow, userId: string): boolean {
  return orderRow.userId === userId
}

/**
 * Registers {@link isOrderMerchant} as the order merchant authorizer. MUST run
 * at startup (called from `setupBonds`) — without it the order resource denies
 * every merchant op (refund / merchant-state status change / non-pending
 * cancel) with 403 `order.error.merchantForbidden`.
 */
export function setupOrderAuthorizer(): void {
  setOrderMerchantAuthorizer(isOrderMerchant)
}
