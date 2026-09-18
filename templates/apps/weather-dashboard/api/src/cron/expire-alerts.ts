import { schedule } from '@molecule/api-cron'
import { findMany, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

/**
 * Maximum number of past-due alerts swept per cron tick. The sweep runs every
 * few minutes, so any overflow is picked up on the next tick.
 */
const EXPIRE_BATCH_LIMIT = 1000

/**
 * Sweep past-due alerts across ALL tenants and mark them `expired`.
 *
 * This intentionally operates globally: expiring stale alerts is SYSTEM
 * maintenance, not a per-user action. It runs with system authority from a
 * cron tick (see `registerAlertExpiryCron`), never from a user request — the
 * former user-facing `POST /expire` route was removed because it let any
 * authenticated user trigger this cross-tenant write.
 *
 * @param now - The reference time; alerts whose `ends_at` is at or before this
 *   are expired. Defaults to the current time (injectable for tests).
 * @returns The number of alerts marked expired.
 */
export async function expireDueAlerts(now: Date = new Date()): Promise<number> {
  const candidates = await findMany<Record<string, unknown>>('alerts', {
    where: [
      { field: 'status', operator: '=', value: 'active' },
      { field: 'ends_at', operator: '<=', value: now },
    ],
    limit: EXPIRE_BATCH_LIMIT,
  })
  let expired = 0
  for (const a of candidates) {
    if (!a.ends_at) continue
    await updateById('alerts', String(a.id), { status: 'expired', updated_at: now })
    expired += 1
  }
  return expired
}

/**
 * Register the periodic alert-expiry cron job. Called once at startup from
 * `setupBonds()`, after the cron provider is bonded. The job name is unique,
 * so re-registration is a no-op for the bonded provider.
 *
 * The schedule is configurable via `ALERT_EXPIRE_CRON` (default: every 5
 * minutes). Errors inside the tick are logged and swallowed so a single failed
 * sweep never crashes the scheduler.
 */
export async function registerAlertExpiryCron(): Promise<void> {
  const cronExpression = process.env.ALERT_EXPIRE_CRON || '*/5 * * * *'
  try {
    await schedule('expire-alerts', cronExpression, async () => {
      try {
        const expired = await expireDueAlerts()
        if (expired > 0) logger.info('alerts.expire.cron', { expired })
      } catch (error) {
        logger.error('alerts.expire.cron', error)
      }
    })
  } catch (error) {
    logger.error('alerts.expire.register', error)
  }
}
