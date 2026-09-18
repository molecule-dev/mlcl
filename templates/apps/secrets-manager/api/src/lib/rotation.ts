/**
 * Secret-rotation scheduling.
 *
 * Each secret stores a `rotation_days` interval and a `last_rotated_at`
 * timestamp, and each vault has a `next_rotation` column that the UI reads to
 * show a "next rotation / overdue" pill, the expiring filter, and the dashboard
 * count. But nothing ever computed `next_rotation`, so it was always null and
 * the rotation warnings never fired. These helpers derive it from the vault's
 * own secrets (pure — no DB/DOM).
 *
 * @module
 */

export interface RotatableSecret {
  rotation_days?: number | string | null
  last_rotated_at?: string | Date | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The next rotation due date for a single secret, or null when it doesn't
 * rotate (`rotation_days` <= 0) or has never been rotated.
 */
export function nextRotationDue(secret: RotatableSecret): Date | null {
  const days = Number(secret.rotation_days ?? 0)
  if (!Number.isFinite(days) || days <= 0) return null
  const last = secret.last_rotated_at ? new Date(secret.last_rotated_at) : null
  if (!last || Number.isNaN(last.getTime())) return null
  return new Date(last.getTime() + days * DAY_MS)
}

/**
 * The soonest upcoming rotation across a set of secrets, as an ISO string, or
 * null if none of them rotate. An overdue secret (due date in the past) still
 * counts — it's the soonest, so the vault surfaces as overdue.
 */
export function soonestRotation(secrets: ReadonlyArray<RotatableSecret>): string | null {
  let soonest: number | null = null
  for (const secret of secrets) {
    const due = nextRotationDue(secret)
    if (due && (soonest === null || due.getTime() < soonest)) {
      soonest = due.getTime()
    }
  }
  return soonest === null ? null : new Date(soonest).toISOString()
}
