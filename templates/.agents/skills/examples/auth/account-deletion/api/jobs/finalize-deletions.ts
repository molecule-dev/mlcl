import { schedule } from '@molecule/api-cron'
import { deleteById, deleteMany, findMany, updateById } from '@molecule/api-database'

const GRACE_PERIOD_DAYS = 30

// APP tables with a snake_case `user_id` FK to purge on hard-delete. ADAPT to your app.
// NOTE these are your OWN tables — the framework tables (usersSecrets, devices) use
// `userId` (camelCase) and are handled explicitly below, so do NOT list them here. Do NOT
// list a table this app doesn't have: none of the framework tables CASCADE on users delete,
// and each purge is best-effort (a missing table is skipped, never aborting the run — see
// the try/catch), but keeping the list accurate avoids noisy logs.
//
// A table listed here MUST carry a `user_id` column. A framework table keyed some OTHER way
// does not fail as a missing table — it fails on the COLUMN (Postgres 42703 `column
// "user_id" does not exist`), which `isMissingTableError` deliberately does not match,
// because a column error is a real purge failure. Listing one therefore sets `purgeFailed`
// every night, the users row is kept so the purge can retry, and the retry fails the same
// way forever: the account is never hard-deleted and the page's "permanently deleted in 30
// days" copy is never kept. The audit log shipped by @molecule/api-audit-database is
// exactly that shape — it identifies the actor in `actor` (`user:<id>`) and has no
// `user_id` — so it does NOT belong in this list. Purge a framework table that keys users
// differently with its own explicit step below, the way `usersSecrets` and `devices` are
// handled.
const APP_TABLES = ['api_keys', 'notifications', 'attachments'] as const

/**
 * Whether a failed APP-table purge means the table simply is not there.
 *
 * A table this app does not have holds NOTHING to purge, so it must not count as
 * a purge failure. `purgeFailed` below defers the hard delete so the purge can
 * retry, and a table that will never exist never stops deferring: the account is
 * then never deleted and the page's "permanently deleted in 30 days" copy is
 * never kept. APP_TABLES above names four tables this example does not migrate,
 * so a verbatim copy hit exactly that. Every OTHER failure — a permission, a
 * connection, an FK from a table not listed — is a real failure and still defers.
 *
 * Codes first (Postgres 42P01 undefined_table; MySQL ER_NO_SUCH_TABLE / errno
 * 1146), then the phrasings the filesystem databases use (SQLite, PGlite, D1:
 * "no such table"), because the store is a bond and the error shape is the
 * provider's.
 *
 * @param err - The rejection from a purge `deleteMany`.
 * @returns Whether the table's absence is why it failed.
 */
function isMissingTableError(err: unknown): boolean {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? (err as { code?: unknown }).code
      : undefined
  if (code === '42P01' || code === 'ER_NO_SUCH_TABLE' || code === 1146) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /no such table|unknown table|relation ".*" does not exist|table ".*" does not exist/i.test(
    msg,
  )
}

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

    // WHICH expired users signed back in — the whole batch, in ONE query.
    //
    // THE CANCEL PATH the deletion page promises ("sign back in before then to
    // cancel"): the DELETE flow signed the user out everywhere (every `devices`
    // row deleted — see api/handlers/me.ts), and a successful log-in creates a
    // new device row. So a `devices` row on a user whose grace period has
    // elapsed IS the sign-back-in the page told them would cancel: clear the
    // soft-delete marker and leave the account (and its data) alone. Without
    // this the promise was only words — the job hard-deleted a user who had done
    // exactly what the page said.
    //
    // ONE query for the batch, not one per user: the probe ran INSIDE the loop,
    // so a full `limit` page of expired accounts paid a thousand sequential
    // round-trips before a single purge — work that scales with the batch, per
    // night, for an answer a single `in` lookup gives (the same
    // resolve-the-set-in-one-read shape the other slices use; see the
    // leaderboard handler's name join). No `limit` on it: a page that cut the
    // answer short would report a user who IS signed back in as having no
    // device, and this job HARD-DELETES on that answer.
    if (expired.length === 0) return
    let signedBackIn: Set<string>
    try {
      const devices = (await findMany<{ userId: string }>('devices', {
        where: [{ field: 'userId', operator: 'in', value: expired.map((user) => user.id) }],
      })) as { userId: string }[]
      signedBackIn = new Set(devices.map((device) => device.userId))
    } catch (err) {
      // Cannot tell whether anyone signed back in? DO NOT purge on a guess: the
      // whole batch retries next run (same policy as the per-purge catches
      // below). A failed round-trip is a connection/permission failure, not a
      // per-user one, so there is no narrower answer to defer.
      console.error('finalize-deletions: sign-back-in check failed', { err })
      return
    }

    for (const user of expired) {
      if (signedBackIn.has(user.id)) {
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
      // A FAILED purge is remembered: the final users delete below is skipped, because
      // once the users row is gone the expired query can never select this user again
      // — a purge that failed this run would be orphaned FOREVER (its retry rides on
      // the user row still existing), and a skipped usersSecrets is exactly the leak
      // above.
      let purgeFailed = false
      try {
        await deleteById('usersSecrets', user.id)
      } catch (err) {
        purgeFailed = true
        console.error('finalize-deletions: usersSecrets purge failed', { userId: user.id, err })
      }
      try {
        await deleteMany('devices', [{ field: 'userId', operator: '=', value: user.id }])
      } catch (err) {
        purgeFailed = true
        console.error('finalize-deletions: devices purge failed', { userId: user.id, err })
      }

      // APP tables — best-effort per table: a table this app doesn't have (relation does
      // not exist) MUST NOT crash the job and freeze every pending hard-delete forever.
      for (const table of APP_TABLES) {
        try {
          await deleteMany(table, [{ field: 'user_id', operator: '=', value: user.id }])
        } catch (err) {
          // A table this app does not have is NOT a purge failure: there is
          // nothing in it to purge, and counting it would defer this account's
          // hard delete for good (see isMissingTableError). It is still logged,
          // so a list that names tables the app never created stays visible.
          if (isMissingTableError(err)) {
            console.warn(`finalize-deletions: no ${table} table — nothing to purge`, {
              userId: user.id,
            })
            continue
          }
          purgeFailed = true
          console.error(`finalize-deletions: ${table} purge failed`, { userId: user.id, err })
        }
      }

      // The final hard delete only runs when EVERY purge above succeeded: the
      // purges are idempotent and the soft-delete marker is still set, so a user
      // with a failed purge is re-selected next run and the failed purge retries.
      // Skipping it is what keeps a transient purge failure recoverable — deleting
      // the users row anyway would make the leftover permanent. A user whose purge
      // fails EVERY night (an FK from an app table not in APP_TABLES is the usual
      // cause) then stays in the grace period and logs every night — visible, and
      // fixable by adding the table to APP_TABLES — instead of vanishing with its
      // credentials still on disk.
      //
      // The delete itself is wrapped like the purges above, and ONE user whose
      // row cannot be deleted must not abort the loop — every user after it would
      // sit undeleted, because each nightly run fails at the same row.
      if (purgeFailed) {
        console.error(
          `finalize-deletions: user ${user.id} kept — a purge failed; the users row stays so it retries next run`,
        )
        continue
      }
      try {
        await deleteById('users', user.id)
      } catch (err) {
        console.error('finalize-deletions: users row delete failed', { userId: user.id, err })
      }
    }
  })
}
