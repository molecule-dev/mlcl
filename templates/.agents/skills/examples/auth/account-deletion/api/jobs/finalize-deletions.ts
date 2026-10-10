import { schedule } from '@molecule/api-cron'
import { deleteById, deleteMany, findMany, updateById } from '@molecule/api-database'

const GRACE_PERIOD_DAYS = 30

// APP tables with a snake_case `user_id` FK to purge on hard-delete. ADAPT to your app.
// NOTE these are your OWN tables — the framework tables (usersSecrets, devices) use
// `userId` (camelCase) and are handled explicitly below, so do NOT list them here. Do NOT
// list a table this app doesn't have: none of the framework tables CASCADE on users delete,
// and each purge is best-effort (a missing table is skipped, never aborting the run — see
// the try/catch), but keeping the list accurate avoids noisy logs.
const APP_TABLES = ['api_keys', 'notifications', 'attachments', 'audit_log'] as const

// Call this once at app startup (e.g. at the bottom of bonds.ts, after
// bond('cron', provider)) to register the daily hard-delete job.
export async function registerFinalizeDeletionsJob(): Promise<void> {
  await schedule('finalize-deletions', '0 4 * * *', async () => {
    // every day at 04:00
    const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const expired = (await findMany('users', {
      where: [
        // `is_not_null`, NEVER `!= null`: SQL evaluates `deleted_at != NULL` as
        // UNKNOWN (not true), so a `!=`-with-null condition matches NO row — the
        // job then finds nobody and account hard-deletion silently never runs.
        { field: 'deleted_at', operator: 'is_not_null' as const },
        { field: 'deleted_at', operator: '<' as const, value: cutoff },
      ],
      limit: 1000,
    })) as { id: string }[]

    for (const user of expired) {
      // THE CANCEL PATH the deletion page promises ("sign back in before then to
      // cancel"): the DELETE flow signed the user out everywhere (every `devices`
      // row deleted — see api/handlers/me.ts), and a successful log-in
      // creates a new device row. So a `devices` row on a user whose grace
      // period has elapsed IS the sign-back-in the page told them would cancel:
      // clear the soft-delete marker and leave the account (and its data) alone.
      // Without this the promise was only words — the job hard-deleted a user
      // who had done exactly what the page said.
      let signedBackIn: boolean
      try {
        const devices = await findMany<{ id: string }>('devices', {
          where: [{ field: 'userId', operator: '=', value: user.id }],
          limit: 1,
        })
        signedBackIn = devices.length > 0
      } catch (err) {
        // Cannot tell whether they signed back in? DO NOT purge on a guess: the
        // user retries next run (same policy as the per-purge catches below).
        console.error('finalize-deletions: sign-back-in check failed', { userId: user.id, err })
        continue
      }
      if (signedBackIn) {
        try {
          await updateById('users', user.id, { deleted_at: null })
          console.log(`finalize-deletions: user ${user.id} signed back in — deletion cancelled`)
        } catch (err) {
          console.error('finalize-deletions: deletion cancel failed', { userId: user.id, err })
        }
        continue
      }

      // FRAMEWORK credential + session cleanup FIRST. These have NO `ON DELETE CASCADE`,
      // so deleting the users row alone orphans them. `usersSecrets.id` IS the user id
      // (1:1), and it holds `passwordHash` + `twoFactorSecret` — leaving it behind is a
      // data-retention / GDPR leak, the whole point of "delete my account". `devices`
      // (active sessions/push tokens) is keyed by `userId` (camelCase, NOT user_id).
      // Wrap each so one failure doesn't abort the batch and leave everyone undeleted.
      try {
        await deleteById('usersSecrets', user.id)
      } catch (err) {
        console.error('finalize-deletions: usersSecrets purge failed', { userId: user.id, err })
      }
      try {
        await deleteMany('devices', [{ field: 'userId', operator: '=', value: user.id }])
      } catch (err) {
        console.error('finalize-deletions: devices purge failed', { userId: user.id, err })
      }

      // APP tables — best-effort per table: a table this app doesn't have (relation does
      // not exist) MUST NOT crash the job and freeze every pending hard-delete forever.
      for (const table of APP_TABLES) {
        try {
          await deleteMany(table, [{ field: 'user_id', operator: '=', value: user.id }])
        } catch (err) {
          console.error(`finalize-deletions: ${table} purge failed`, { userId: user.id, err })
        }
      }

      // The final hard delete is wrapped like the purges above: ONE user whose
      // row cannot be deleted (an FK from an app table not in APP_TABLES is the
      // usual cause) must not abort the loop — every user after it would sit in
      // the grace period FOREVER, because each nightly run fails at the same
      // row. Its purges already ran and are idempotent, so logging and moving
      // on lets the rest of the batch clear; the failed user retries next run.
      try {
        await deleteById('users', user.id)
      } catch (err) {
        console.error('finalize-deletions: users row delete failed', { userId: user.id, err })
      }
    }
  })
}
