// @vitest-environment node
/**
 * The account-deletion slice's nightly `finalize-deletions` job is what actually
 * HARD-DELETES an account after its 30-day grace period — the whole point of
 * "delete my account" (the module comment calls the leftover credential row a
 * data-retention / GDPR leak). It selected the expired users with
 * `{ field: 'deleted_at', operator: '!=', value: null }`, which every bond
 * translates to a plain `"deleted_at" != $1` carrying NULL:
 *
 *   SQL evaluates `x != NULL` as UNKNOWN, and UNKNOWN does not satisfy a WHERE
 *   clause — so the condition matches NO row, `findMany('users', …)` returned an
 *   empty array, and the job's purge loop never ran: no user was ever
 *   hard-deleted, on any database, with no error logged. `--force` has nothing
 *   to do with it; the job simply found nobody.
 *
 * The fleet's convention for "is set" is `operator: 'is_not_null'` (see
 * `templates/apps/wiki/api/src/handlers/pages.ts`, error-tracker's profile,
 * ai-writing-studio's dashboard), which the Postgres store renders as
 * `IS NOT NULL`.
 *
 * This drives the REAL exported job: only the cron bond (which hands the test
 * the registered callback) and the database bond are mocked. The `users` rows
 * are matched by a faithful SQL-semantics evaluator over the WHERE conditions —
 * three-valued logic mirroring `buildWhere` in the postgres bond — so the
 * `!=`/null shape finds nobody here exactly as it finds nobody in production.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** The handler the job registers with the cron bond. */
const cron = vi.hoisted(() => ({ handler: null as null | (() => Promise<void>) }))

vi.mock('@molecule/api-cron', () => ({
  schedule: async (_name: string, _expr: string, handler: () => Promise<void>): Promise<string> => {
    cron.handler = handler
    return 'job-finalize-deletions'
  },
}))

const database = vi.hoisted(() => ({
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => database)

const { registerFinalizeDeletionsJob } =
  await import('../../../templates/.agents/skills/examples/auth/account-deletion/api/jobs/finalize-deletions.js')

interface Cond {
  field: string
  operator: string
  value?: unknown
}

type Row = { id: string; deleted_at: string | null }

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Evaluate one WHERE condition against a row the way SQL does — a comparison
 * against NULL is UNKNOWN, and UNKNOWN never satisfies a filter. Mirrors the
 * `buildWhere` switch in `@molecule/api-database-postgresql` (which renders
 * `!=`/`<` as ordinary comparisons, `is_not_null` as `IS NOT NULL`, and `in` as
 * `IN (…)` — the operator the sign-back-in probe resolves its batch with).
 */
function matches(row: Row, cond: Cond): boolean {
  const value = (row as unknown as Record<string, unknown>)[cond.field]
  if (cond.operator === 'is_not_null') return value !== null && value !== undefined
  if (cond.operator === 'is_null') return value === null || value === undefined
  // Every comparison operator: NULL on either side is UNKNOWN → filtered out.
  if (value === null || value === undefined) return false
  if (cond.value === null || cond.value === undefined) return false
  // `x IN (…)` with NULL `x` is UNKNOWN too, which the guard above already
  // filters — so this sits after it, like the comparisons below.
  if (cond.operator === 'in') return Array.isArray(cond.value) && cond.value.includes(value)
  const left = cond.field === 'deleted_at' ? String(value) : value
  switch (cond.operator) {
    case '=':
      return left === cond.value
    case '!=':
      return left !== cond.value
    case '<':
      return String(left) < String(cond.value)
    case '>':
      return String(left) > String(cond.value)
    case '<=':
      return String(left) <= String(cond.value)
    case '>=':
      return String(left) >= String(cond.value)
    default:
      throw new Error(`unsupported operator in this evaluator: ${cond.operator}`)
  }
}

let users: Row[]
/** The `devices` rows the job's sign-back-in probe finds, per test. */
let devices: Array<{ id: string; userId: string }>

beforeEach(() => {
  cron.handler = null
  users = []
  devices = []
  vi.clearAllMocks()
  // The mocked store: `users` AND `devices` answer the job's WHERE clause with
  // SQL semantics — a devices stub that returned every row regardless of the
  // probe's `userId in (…)` condition could not catch the probe matching
  // ANOTHER user's device (in production that cancels every expired user's
  // deletion).
  database.findMany.mockImplementation(
    async (table: string, options: { where?: Cond[] }): Promise<unknown[]> => {
      const where = options.where ?? []
      if (table === 'devices')
        return devices.filter((row) => where.every((cond) => matches(row, cond)))
      if (table !== 'users') return []
      return users.filter((row) => where.every((cond) => matches(row, cond)))
    },
  )
  database.updateById.mockResolvedValue({ data: null, affected: 1 })
  // The per-user confirmation the job runs before purging anyone: `findOne`
  // answers with THAT user's own row (SQL `LIMIT 1` semantics), so a device row
  // the capped batch read could not return is still found here.
  database.findOne.mockImplementation(async (table: string, where: Cond[]) => {
    if (table !== 'devices') return null
    return devices.find((row) => where.every((cond) => matches(row, cond))) ?? null
  })
  database.deleteById.mockResolvedValue({ data: null, affected: 1 })
  database.deleteMany.mockResolvedValue({ data: [], affected: 1 })
})

/** Run the registered job once, as the cron provider would on its tick. */
async function runJob(): Promise<void> {
  await registerFinalizeDeletionsJob()
  if (!cron.handler) throw new Error('the job registered no handler with the cron bond')
  await cron.handler()
}

describe('finalize-deletions — the expired-user filter must actually match', () => {
  it('hard-deletes a user whose grace period elapsed', async () => {
    users = [{ id: 'u-expired', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]

    await runJob()

    // The purge ran at all — the `!= null` shape selected nobody, so this loop
    // body was dead code and the account was never deleted.
    expect(database.deleteById).toHaveBeenCalledWith('usersSecrets', 'u-expired')
    expect(database.deleteMany).toHaveBeenCalledWith('devices', [
      { field: 'userId', operator: '=', value: 'u-expired' },
    ])
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-expired')
  })

  it('leaves a user still inside the grace period, and a live user, alone', async () => {
    users = [
      { id: 'u-recent', deleted_at: new Date(Date.now() - 2 * DAY_MS).toISOString() },
      { id: 'u-live', deleted_at: null },
    ]

    await runJob()

    expect(database.deleteById).not.toHaveBeenCalled()
    expect(database.deleteMany).not.toHaveBeenCalled()
  })

  it('cancels the deletion of a user who signed back in — the page’s promise — instead of purging them', async () => {
    // Past the grace period, but the DELETE flow had signed them out everywhere
    // (every devices row deleted) and a log-in created a new one — exactly what
    // DeleteAccountPage's copy says cancels the deletion. Before this path
    // existed, the job hard-deleted the account of a user who had done exactly
    // what the page told them to do.
    users = [{ id: 'u-returned', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    devices = [{ id: 'd1', userId: 'u-returned' }]

    await runJob()

    // The soft-delete marker is cleared — the documented cancel — and nothing
    // was purged.
    expect(database.updateById).toHaveBeenCalledWith('users', 'u-returned', { deleted_at: null })
    expect(database.deleteById).not.toHaveBeenCalled()
    expect(database.deleteMany).not.toHaveBeenCalled()
  })

  it('still hard-deletes a user past the grace period who never signed back in', async () => {
    users = [{ id: 'u-gone', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    devices = []

    await runJob()

    expect(database.updateById).not.toHaveBeenCalled()
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-gone')
  })

  it('the sign-back-in probe is scoped to the USER’s own devices, not any device row', async () => {
    // Two expired users; the only devices row belongs to the user who DID sign
    // back in. A probe that ignored its `userId =` condition found this row for
    // EVERY user — it would cancel u-gone's deletion too, stranding an account
    // the user asked to delete.
    users = [
      { id: 'u-returned', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() },
      { id: 'u-gone', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() },
    ]
    devices = [{ id: 'd1', userId: 'u-returned' }]

    await runJob()

    expect(database.updateById).toHaveBeenCalledWith('users', 'u-returned', { deleted_at: null })
    expect(database.updateById).not.toHaveBeenCalledWith('users', 'u-gone', expect.anything())
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-gone')
  })

  // The purges are idempotent and the soft-delete marker is still set, so a
  // failed purge can simply retry next run — but ONLY while the users row
  // still exists: once the hard delete lands, the expired-user query can never
  // select this user again, and a purge that failed this run (a transient
  // store error is enough) is orphaned FOREVER. For usersSecrets that orphan
  // is the passwordHash + twoFactorSecret row the module comment calls the
  // data-retention leak the job exists to prevent.
  // The example's own APP_TABLES names three tables it never migrates
  // (api_keys, notifications, attachments), and the module comment promises
  // "a missing table is skipped, never aborting the run". Counting the missing
  // table as a purge failure broke exactly that promise: every purge threw
  // 42P01, `purgeFailed` was set, and the hard delete was deferred — every
  // night, for good — so the page's "permanently deleted in 30 days" copy and the
  // README's Verify step ("31 days later, the job hard-deletes the row") never
  // happened for a single account.
  it('skips a table this app does not have instead of deferring the deletion forever', async () => {
    users = [
      { id: 'u-no-app-tables', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() },
    ]
    devices = []
    database.deleteMany.mockImplementation(async (table: string) => {
      if (table === 'devices') return { data: [], affected: 1 }
      // What the postgres bond rejects a DELETE against a missing relation with.
      const err = new Error(`relation "${table}" does not exist`) as Error & { code?: string }
      err.code = '42P01'
      throw err
    })

    await runJob()

    expect(database.deleteById).toHaveBeenCalledWith('usersSecrets', 'u-no-app-tables')
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-no-app-tables')
  })

  it('never purges a table that has no `user_id` column — that failure wedges the deletion', async () => {
    // The framework audit table (@molecule/api-audit-database) identifies the
    // actor in `actor` (`user:<id>`) and has NO `user_id`. Listing it in
    // APP_TABLES does not fail as a missing TABLE — it fails on the COLUMN
    // (42703, `column "user_id" does not exist`), which `isMissingTableError`
    // deliberately does not match, because a column error is a real purge
    // failure. `purgeFailed` then deferred the hard delete EVERY night, and the
    // retry failed the same way forever: an account whose user asked to be
    // deleted was never deleted, and the page's "permanently deleted in 30 days"
    // copy was never kept.
    users = [{ id: 'u-audited', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    devices = []
    database.deleteMany.mockImplementation(async (table: string) => {
      if (table === 'devices') return { data: [], affected: 1 }
      if (table === 'audit_log') {
        const err = new Error('column "user_id" does not exist') as Error & { code?: string }
        err.code = '42703'
        throw err
      }
      // The example's other app tables are absent from a bare app.
      const err = new Error(`relation "${table}" does not exist`) as Error & { code?: string }
      err.code = '42P01'
      throw err
    })

    await runJob()

    // The wrong-column prune is never attempted…
    expect(database.deleteMany).not.toHaveBeenCalledWith('audit_log', expect.anything())
    // …so the account is hard-deleted like any other.
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-audited')
  })

  // …and the skip must be narrow: any failure that is NOT an absent table is
  // still a real failure (the transient/denied case above), or the fix would
  // silently orphan the row the purge could not delete.
  it('still defers the deletion when a purge fails for any reason other than a missing table', async () => {
    users = [{ id: 'u-denied', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    devices = []
    database.deleteMany.mockImplementation(async (table: string) => {
      if (table === 'devices') return { data: [], affected: 1 }
      // 42501 insufficient_privilege — the table is there, the purge did not run.
      const err = new Error(`permission denied for table ${table}`) as Error & { code?: string }
      err.code = '42501'
      throw err
    })

    await runJob()

    expect(database.deleteById).toHaveBeenCalledWith('usersSecrets', 'u-denied')
    expect(database.deleteById).not.toHaveBeenCalledWith('users', 'u-denied')
  })

  it('a failed purge defers the hard delete so it retries, never orphaning the failed purge', async () => {
    users = [{ id: 'u-partial', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    devices = []
    database.deleteById.mockImplementation(async (table: string) => {
      if (table === 'usersSecrets') throw new Error('connection reset')
      return { data: null, affected: 1 }
    })

    await runJob()

    // The users row SURVIVES this run: deleting it would strand the failed
    // usersSecrets purge permanently.
    expect(database.deleteById).not.toHaveBeenCalledWith('users', 'u-partial')
    // …and the other purges still ran (each is independent and idempotent).
    expect(database.deleteMany).toHaveBeenCalledWith('devices', [
      { field: 'userId', operator: '=', value: 'u-partial' },
    ])

    // Next run, with the transient failure healed, the same user is re-selected
    // (the soft-delete marker was never removed) and the deletion completes.
    database.deleteById.mockResolvedValue({ data: null, affected: 1 })
    await runJob()
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-partial')
  })

  // The sign-back-in probe used to run INSIDE the per-user loop, so a full
  // `limit` page of expired accounts paid one round-trip per account before a
  // single purge — work that scales with the batch, every night, for an answer
  // one `in` lookup gives.
  it('resolves the sign-back-in set in ONE devices query for the whole batch', async () => {
    const expired = new Date(Date.now() - 40 * DAY_MS).toISOString()
    users = [
      { id: 'u-a', deleted_at: expired },
      { id: 'u-b', deleted_at: expired },
      { id: 'u-returned', deleted_at: expired },
    ]
    devices = [{ id: 'd1', userId: 'u-returned' }]

    await runJob()

    const deviceQueries = database.findMany.mock.calls.filter((call) => call[0] === 'devices')
    expect(deviceQueries).toHaveLength(1)
    expect(deviceQueries[0]?.[1]).toEqual({
      where: [{ field: 'userId', operator: 'in', value: ['u-a', 'u-b', 'u-returned'] }],
    })
    // …and the per-user outcome is unchanged: the account with a device row is
    // cancelled, the other two hard-deleted.
    expect(database.updateById).toHaveBeenCalledWith('users', 'u-returned', { deleted_at: null })
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-a')
    expect(database.deleteById).toHaveBeenCalledWith('users', 'u-b')
  })

  // An un-limited `findMany` is NOT unbounded: every database bond applies its
  // own default LIMIT (MAX_DEFAULT_LIMIT = 10 000 rows), so the batch probe's
  // silence about a user may mean only that their device row fell past the cap.
  // Reading that silence as "no device" HARD-DELETES the account of a user who
  // signed back in — precisely the promise the deletion page makes.
  it('cancels a sign-back-in the capped batch read could not return', async () => {
    users = [{ id: 'u-returned', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    // The row exists in the store (findOne finds it below)…
    devices = [{ id: 'd1', userId: 'u-returned' }]
    // …but the batch read's result was cut at the store's cap, so the job sees
    // no row for this user there. A per-user read is the only honest answer.
    database.findMany.mockImplementation(
      async (table: string, options: { where?: Cond[] }): Promise<unknown[]> => {
        if (table === 'devices') return []
        return users.filter((row) => (options.where ?? []).every((cond) => matches(row, cond)))
      },
    )

    await runJob()

    expect(database.updateById).toHaveBeenCalledWith('users', 'u-returned', { deleted_at: null })
    expect(database.deleteById).not.toHaveBeenCalled()
    expect(database.deleteMany).not.toHaveBeenCalled()
  })

  it('keeps the account when the per-user sign-back-in re-check cannot reach the store', async () => {
    users = [{ id: 'u-unknown', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    // The batch read returned nothing for this user (capped, or the user simply
    // has no device) and the confirmation query fails — the answer is unknown,
    // and an unknown answer must never be purged (the users row stays, so the
    // whole decision retries next run).
    database.findMany.mockImplementation(
      async (table: string, options: { where?: Cond[] }): Promise<unknown[]> => {
        if (table === 'devices') return []
        return users.filter((row) => (options.where ?? []).every((cond) => matches(row, cond)))
      },
    )
    database.findOne.mockRejectedValue(new Error('connection reset'))

    await runJob()

    expect(database.deleteById).not.toHaveBeenCalled()
    expect(database.deleteMany).not.toHaveBeenCalled()
  })

  it('purges nobody when the batched sign-back-in probe itself fails', async () => {
    users = [{ id: 'u-x', deleted_at: new Date(Date.now() - 40 * DAY_MS).toISOString() }]
    database.findMany.mockImplementation(async (table: string): Promise<unknown[]> => {
      if (table === 'devices') throw new Error('connection reset')
      return users
    })

    await runJob()

    // The answer is unknown for the whole batch, so nothing is deleted — every
    // user is re-selected next run (never a hard delete on a guess).
    expect(database.deleteById).not.toHaveBeenCalled()
    expect(database.deleteMany).not.toHaveBeenCalled()
  })
})
