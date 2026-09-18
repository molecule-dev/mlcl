/**
 * Order merchant authorizer wiring for subscription-box.
 *
 * `@molecule/api-resource-order` FAILS CLOSED on its merchant-only lifecycle
 * operations — `POST /orders/:id/refund`, a `PUT /orders/:id/status` transition
 * INTO a merchant state (`confirmed`/`processing`/`shipped`/`delivered`/
 * `refunded`), and `POST /orders/:id/cancel` of an order that has already
 * progressed past `pending`. Until an app registers a merchant authorizer, every
 * one of those returns 403. An order row records only the BUYER (`userId`), so
 * the package cannot know who the merchant is; the consuming app must supply it.
 *
 * subscription-box is a SINGLE-merchant service: there is one store, run by its
 * catalog operator(s). The merchant entitled to drive any order's lifecycle is
 * therefore the app's existing admin — `users.role === 'admin'` or an
 * `ADMIN_EMAILS`-allow-listed owner — the SAME gate that already protects the
 * shared `subscription_plans` catalog and shipment fulfillment writes (see
 * `middleware/require-admin.ts`). We reuse that exact mechanism via
 * {@link isAdminUser} rather than inventing a parallel seller concept. Because
 * the merchant is the store admin regardless of which order is acted on, the
 * `orderRow` argument is not consulted.
 *
 * Buyers are unaffected: the order owner (`orderRow.userId === userId`) still
 * creates / lists / reads / views history of their own orders and may cancel
 * their OWN order while it is still `pending` — the package handles those
 * owner-gated paths itself.
 *
 * @module
 */

import { setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

import { isAdminUser } from './middleware/require-admin.js'

/**
 * Registers the order merchant authorizer with `@molecule/api-resource-order`.
 * Call once at startup (from `setupBonds()`). A merchant op is allowed only when
 * the authenticated caller is the store admin; everyone else (including the
 * order's own buyer) is denied with `order.error.merchantForbidden` (403).
 */
export function setupOrderMerchantAuthorizer(): void {
  setOrderMerchantAuthorizer((_orderRow, userId) => isAdminUser(userId))
}
