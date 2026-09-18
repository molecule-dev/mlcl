import { type OrderRow, setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

/**
 * Merchant predicate for `@molecule/api-resource-order`'s fail-closed lifecycle
 * gate.
 *
 * In restaurant-ordering every authenticated user is a restaurant OPERATOR (one
 * tenant per operator); diners are guests/customers and are NEVER authenticated
 * (they order through the public QR `/guest/orders` flow). Every order — whether
 * created by the operator (`POST /orders`) or by a guest (`POST /guest/orders`)
 * — is filed under the operator's `user_id`. An order's owner is therefore the
 * OPERATOR who owns the tenant's data — the MERCHANT — NOT a buyer.
 *
 * This is the opposite of the package's default buyer-owned model (where
 * `orderRow.userId` is the buyer and an owner check would be a self-service
 * hole). Here, gating the merchant lifecycle ops (refund, a merchant-state
 * status change, cancelling an already-progressed order) on order-ownership IS
 * the merchant check, and it correctly DENIES any OTHER operator acting on an
 * order they do not own (→ 403 `order.error.merchantForbidden`). This reuses the
 * app's existing per-operator ownership mechanism rather than introducing a
 * parallel role system.
 *
 * @param orderRow - The order being acted on.
 * @param userId - The authenticated user (operator) requesting the lifecycle op.
 * @returns `true` when the caller is the operator/merchant that owns the order.
 */
export function isOrderMerchant(orderRow: OrderRow, userId: string): boolean {
  return orderRow.userId === userId
}

/**
 * Registers the order merchant authorizer. `@molecule/api-resource-order` FAILS
 * CLOSED on every merchant op (refund / merchant-state `updateStatus` / cancel
 * of an already-progressed order), returning 403 until an authorizer is
 * registered — so this MUST run at startup (called from `setupBonds`).
 */
export function setupResourceOrder(): void {
  setOrderMerchantAuthorizer(isOrderMerchant)
}
