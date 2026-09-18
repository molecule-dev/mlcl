/**
 * Store-operator (merchant) identity — the single source of truth for "is this
 * user entitled to act as the grocery store's operator/merchant?".
 *
 * Grocery-delivery is a SINGLE-merchant app: one store, run by its operator(s).
 * The same predicate gates BOTH the admin route middleware (`requireAdmin`,
 * which protects global catalogue + delivery-slot writes) AND the order-resource
 * merchant authorizer (`setOrderMerchantAuthorizer`, which gates refunds and
 * forward order-lifecycle transitions). Defining it once here keeps those two
 * surfaces from drifting apart.
 *
 * @module
 */
import { findById, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

/**
 * Store-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that operate this grocery
 * service, e.g. `ADMIN_EMAILS=owner@grocer.com,ops@grocer.com`. Any signed-in
 * user whose account email is on this list is treated as the operator and is
 * lazily promoted to `role = 'admin'` on first access so the column becomes the
 * durable source of truth thereafter.
 */
export const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

/** Minimal shape of a `users` row needed to decide operator status. */
export interface StoreUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Resolves whether `userId` is a store operator (merchant/admin) for this
 * single-merchant grocery app. Returns `true` when the user's `users` row has
 * `role === 'admin'`, OR their account email is in the `ADMIN_EMAILS`
 * allow-list — in which case they are lazily promoted to `role = 'admin'` so the
 * column is the durable source of truth on subsequent requests. Returns `false`
 * for an absent user or an ordinary shopper.
 *
 * @param userId - The authenticated user id to check.
 * @returns `true` if the user may act as the store operator/merchant.
 */
export async function isStoreOperator(userId: string): Promise<boolean> {
  if (!userId) return false

  const user = await findById<StoreUser>('users', userId)
  if (!user) return false

  if (user.role === 'admin') return true

  const email = String(user.email ?? '').toLowerCase()
  if (email && adminEmails.includes(email)) {
    // Designated operator — durably promote so the role column is the source of
    // truth on subsequent requests. Best-effort: a write failure must not lock
    // the operator out of their own store.
    try {
      await updateById('users', userId, { role: 'admin' })
    } catch (error) {
      logger.warn({ error }, 'Failed to persist admin role promotion')
    }
    return true
  }

  return false
}
