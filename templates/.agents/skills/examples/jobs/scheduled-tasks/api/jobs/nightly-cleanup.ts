import { schedule } from '@molecule/api-cron'
import { deleteMany } from '@molecule/api-database'

// The cron PATTERN is the point of this example — the workload below is a PLACEHOLDER.
// `CLEANUP_TABLE`/`EXPIRY_COLUMN` are NOT framework tables: a molecule app has no `sessions`
// table (sessions are device-token rows in `devices`, which has no `expires_at`). Point
// these at a table your app actually has expiring rows in — e.g. the `magic_link_tokens` /
// `email_verification_tokens` from the auth slices, or your own drafts/exports/jobs table.
const CLEANUP_TABLE = 'sessions'
const EXPIRY_COLUMN = 'expires_at'
const RETENTION_DAYS = 30

/**
 * Registers the nightly-cleanup cron job. Call this from `registerJobs()` AFTER the
 * cron provider is wired (`setProvider()` in `bonds/jobs-*.ts`). It must NOT run at
 * import time: `schedule()` calls `getProvider()`, which THROWS "Cron provider not
 * configured" if no provider is set yet — so a top-level `await schedule(...)` in a
 * statically-imported module would run before `setupBonds()` and crash the server on
 * boot. Registering inside a function keeps ordering explicit and safe.
 */
export async function registerNightlyCleanup(): Promise<void> {
  await schedule('nightly-cleanup', '0 3 * * *', async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    try {
      // deleteMany is one round-trip vs findMany + per-row deleteById. `affected` is the count.
      const result = await deleteMany(CLEANUP_TABLE, [
        { field: EXPIRY_COLUMN, operator: '<', value: cutoff },
      ])
      console.log(`nightly-cleanup: deleted ${result.affected} expired ${CLEANUP_TABLE} rows`)
    } catch (err) {
      // A scheduled job must never throw out of its callback on a missing/renamed table — that
      // just fails silently every night. Log it so a wrong CLEANUP_TABLE is visible, not buried.
      console.error(`nightly-cleanup: failed (is ${CLEANUP_TABLE}.${EXPIRY_COLUMN} correct?)`, err)
    }
  })
}
