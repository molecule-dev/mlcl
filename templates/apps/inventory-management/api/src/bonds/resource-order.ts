/**
 * Order resource merchant-authorizer wiring.
 *
 * `@molecule/api-resource-order` fails CLOSED on every MERCHANT-only lifecycle
 * operation — `POST /orders/:id/refund`, a `PUT /orders/:id/status` transition
 * into a merchant state (confirmed/processing/shipped/delivered/refunded), and
 * cancelling an order that has already progressed past `pending` — until the
 * app registers a merchant authorizer answering "is this caller the MERCHANT
 * entitled to drive this order's lifecycle?". Until one is registered, every
 * merchant op returns 403 (`order.error.merchantForbidden`).
 *
 * Inventory Management is single-tenant: every order is owned by the inventory
 * manager who created it (`orderRow.userId`), and THAT user IS the warehouse
 * operator / merchant who drives the order through receive / ship / cancel /
 * refund. The order's external counterparty (supplier or customer) is recorded
 * only as the free-text `partner` and is never a system user — so there is no
 * separate "buyer" account to fence the merchant lifecycle off from. The
 * correct merchant identity here is therefore the owning user, reusing the very
 * same per-user ownership check the app enforces everywhere else (orders,
 * warehouses, products and stock are all `user_id`-scoped). A different account
 * (a non-owner) is denied.
 *
 * We deliberately do NOT invent an admin/staff role: there is no multi-user
 * tenant in this app (each account owns an isolated data silo), so a role flag
 * would have no non-merchant user to gate against, and denying the owner would
 * lock operators out of managing their own orders.
 *
 * @module
 */

import { setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

/**
 * Registers the merchant authorizer for the order resource. The merchant is the
 * order's owning inventory manager; a non-owner is denied. Call once at startup.
 */
export function setupResourceOrder(): void {
  setOrderMerchantAuthorizer((orderRow, userId) => orderRow.userId === userId)
}
