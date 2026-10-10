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
 * `!=`/`<` as ordinary comparisons and `is_not_null` as `IS NOT NULL`).
 */
function matches(row: Row, cond: Cond): boolean {
  const value = (row as unknown as Record<string, unknown>)[cond.field]
  if (cond.operator === 'is_not_null') return value !== null && value !== undefined
  if (cond.operator === 'is_null') return value === null || value === undefined
  // Every comparison operator: NULL on either side is UNKNOWN → filtered out.
  if (value === null || value === undefined) return false
  if (cond.value === null || cond.value === undefined) return false
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
  // The mocked store: `users` answers the job's WHERE clause with SQL semantics;
  // every other table is empty and reports its deletes as affected rows.
  database.findMany.mockImplementation(
    async (table: string, options: { where?: Cond[] }): Promise<unknown[]> => {
      if (table === 'devices') return devices
      if (table !== 'users') return []
      const where = options.where ?? []
      return users.filter((row) => where.every((cond) => matches(row, cond)))
    },
  )
  database.updateById.mockResolvedValue({ data: null, affected: 1 })
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
})
