/**
 * Deal availability-window helpers.
 *
 * A deal is only "live" inside its `[starts_at, expires_at)` window: before
 * `starts_at` it has not launched yet, at/after `expires_at` it has ended.
 * `expires_at` was gated on the list + purchase paths but `starts_at` never
 * was — so a deal scheduled for the future was publicly listed and even
 * purchasable before it went live. These predicates gate both bounds so the
 * activation half is honored everywhere the expiry half already is.
 *
 * The DataStore has no date comparisons, so this filtering happens in the app
 * layer after the `status='active'` query (mirroring the existing expiry
 * filter).
 */

/** The subset of a deal row these predicates read. */
export interface DealWindow {
  starts_at?: string | Date | null
  expires_at?: string | Date | null
}

/** True once the deal's activation time has arrived (or it has no start). */
export function hasStarted(deal: DealWindow, now: number = Date.now()): boolean {
  const startsAt = deal.starts_at
  return startsAt ? new Date(startsAt as string).getTime() <= now : true
}

/** True while the deal has not yet expired (or it has no expiry). */
export function notExpired(deal: DealWindow, now: number = Date.now()): boolean {
  const expiresAt = deal.expires_at
  return expiresAt ? new Date(expiresAt as string).getTime() > now : true
}

/** True when the deal is currently live: started AND not expired. */
export function isDealLive(deal: DealWindow, now: number = Date.now()): boolean {
  return hasStarted(deal, now) && notExpired(deal, now)
}
