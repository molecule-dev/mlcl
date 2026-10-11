import { schedule } from '@molecule/api-cron'
import { deleteById, deleteMany, findMany, findOne, updateById } from '@molecule/api-database'

const GRACE_PERIOD_DAYS = 30

// APP tables with a snake_case `user_id` FK to purge on hard-delete. ADAPT to your app.
// NOTE these are your OWN tables — the framework tables handled explicitly below are keyed
// differently (`usersSecrets` by `id`, which IS the user id; `devices` by `userId`), so do
// NOT list them here. Do NOT
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
 * never kept. APP_TABLES above names three tables this example does not migrate,
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
  const record =
    typeof err === 'object' && err !== null ? (err as { code?: unknown; errno?: unknown }) : null
  if (record?.code === '42P01' || record?.code === 'ER_NO_SUCH_TABLE') return true
  // MySQL reports the NUMERIC code on `errno`, not `code` — mysql2 pairs
  // `code: 'ER_NO_SUCH_TABLE'` with `errno: 1146`. Testing the number against
  // `code` (what this used to do) could never match, so the `errno 1146` the
  // doc above promises was dead; a driver that reports only the number was
  // classified as a REAL purge failure and wedged the account. Read both keys,
  // the same split the payments resource's duplicate-key check uses.
  if (record?.errno === 1146) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /no such table|unknown table|relation ".*" does not exist|table ".*" does not exist/i.test(
    msg,
  )
}

/**
 * Whether `userId` has signed back in since requesting deletion — the sign-in
 * the deletion page's copy promises will cancel the deletion.
 *
 * The batch probe its caller runs first answers the whole page in one query, and
 * a row it RETURNS is proof positive. Its silence is NOT proof of absence:
 * `findMany` always applies a LIMIT (every database bond caps an un-limited read
 * at MAX_DEFAULT_LIMIT — 10 000 rows), so a device row past that cap is missing
 * from the result, and treating that as "no device" HARD-DELETES the account of
 * a user who did exactly what the page told them to. Absence is therefore
 * confirmed against that user's OWN rows, where the row count can never reach
 * the cap.
 *
 * @param userId - The expired user being considered for hard deletion.
 * @param batch - The ids the batch probe returned a device row for.
 * @returns `true` signed back in, `false` proven not to have, `null` when the
 *   store could not answer (never purge on a guess).
 */
async function hasSignedBackIn(
  userId: string,
  batch: ReadonlySet<string>,
): Promise<boolean | null> {
  if (batch.has(userId)) return true
  try {
    return (await findOne('devices', [{ field: 'userId', operator: '=', value: userId }])) !== null
  } catch (err) {
    console.error('finalize-deletions: sign-back-in re-check failed', { userId, err })
    return null
  }
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
    // ONE query resolves the SET of users the batch can prove signed back in —
    // good enough for the cancel path, which is the common shape of a large
    // batch, and cheap (the same resolve-the-set-in-one-read shape the other
    // slices use; see the leaderboard handler's name join). It is NOT the answer
    // for a user the batch stayed silent about: an un-limited `findMany` is still
    // capped by the store's own default LIMIT (every database bond applies
    // MAX_DEFAULT_LIMIT — 10 000 rows), so a device row past the cap is missing
    // from this result — and reading that silence as "no device" hard-deletes an
    // account the user cancelled by signing back in. hasSignedBackIn below
    // re-checks such a user against their OWN rows before anything is purged.
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
      // Presence from the batch, ABSENCE confirmed per user — a batch that was
      // capped, or a re-check that could not reach the store, must never be read
      // as "nobody signed back in" (see hasSignedBackIn).
      const signedIn = await hasSignedBackIn(user.id, signedBackIn)
      if (signedIn === null) continue
      if (signedIn) {
        try {
          await updateById('users', user.id, { deleted_at: null })
          console.log(`finalize-deletions: user ${user.id} signed back in — deletion cancelled`)
        } catch (err) {
          console.error('finalize-deletions: deletion cancel failed', { userId: user.id, err })
        }
        continue
      }

      // FRAMEWORK credential cleanup FIRST. These have NO `ON DELETE CASCADE`,
      // so deleting the users row alone orphans them. `usersSecrets.id` IS the user id
      // (1:1), and it holds `passwordHash` + `twoFactorSecret` — leaving it behind is a
      // data-retention / GDPR leak, the whole point of "delete my account". Wrap each
      // purge so one failure doesn't abort the batch and leave everyone undeleted.
      // A FAILED purge is remembered: the final users delete below is skipped, because
      // once the users row is gone the expired query can never select this user again
      // — a purge that failed this run would be orphaned FOREVER (its retry rides on
      // the user row still existing), and a skipped usersSecrets is exactly the leak
      // above. The `devices` purge is deliberately NOT here: it deletes the rows the
      // sign-back-in re-check below reads, so it runs only after that check.
      let purgeFailed = false
      try {
        await deleteById('usersSecrets', user.id)
      } catch (err) {
        purgeFailed = true
        console.error('finalize-deletions: usersSecrets purge failed', { userId: user.id, err })
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

      // …and ONE more sign-back-in check BEFORE the session purge — the last read
      // that can still see one. The `devices` purge deletes exactly the rows that
      // prove a sign-back-in, so a check placed after it can never confirm a
      // sign-in that landed during the purges above: the purge erased the
      // evidence and the account was then hard-deleted, against the page's
      // "sign back in to cancel" promise. Reading the still-intact table here
      // honors every sign-in up to this instant, including one that landed
      // between the first check and now. The two steps still cannot be made
      // atomic: the only remaining race is the gap between this read and the
      // session purge + delete below.
      const signedInNow = await hasSignedBackIn(user.id, signedBackIn)
      if (signedInNow === null) {
        // The store could not answer — never purge on a guess (the same rule the
        // first check applies); the account survives to the next run, and the
        // session purge waits with it (see below).
        console.error(
          `finalize-deletions: user ${user.id} kept — could not re-confirm the sign-back-in state`,
        )
        continue
      }
      if (signedInNow) {
        try {
          await updateById('users', user.id, { deleted_at: null })
          console.log(
            `finalize-deletions: user ${user.id} signed back in during the purge — deletion cancelled`,
          )
        } catch (err) {
          console.error('finalize-deletions: deletion cancel failed', { userId: user.id, err })
        }
        // The devices purge below is skipped too: the session row IS the
        // sign-back-in evidence, and the account just stayed.
        continue
      }

      // The session purge (`devices` — active sessions/push tokens, keyed by
      // `userId`, camelCase NOT user_id) runs only once the re-check above has
      // read the table, and still runs when a purge above already failed: each
      // purge is independent and idempotent, and an account that is leaving this
      // run or the next should not keep its sessions while it waits.
      try {
        await deleteMany('devices', [{ field: 'userId', operator: '=', value: user.id }])
      } catch (err) {
        purgeFailed = true
        console.error('finalize-deletions: devices purge failed', { userId: user.id, err })
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
