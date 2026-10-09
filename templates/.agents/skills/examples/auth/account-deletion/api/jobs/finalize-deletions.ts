import { schedule } from '@molecule/api-cron'
import { deleteById, deleteMany, findMany } from '@molecule/api-database'

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
        { field: 'deleted_at', operator: '!=' as const, value: null },
        { field: 'deleted_at', operator: '<' as const, value: cutoff },
      ],
      limit: 1000,
    })) as { id: string }[]

    for (const user of expired) {
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

      await deleteById('users', user.id)
    }
  })
}
