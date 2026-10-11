// @vitest-environment node
/**
 * The account-deletion slice's `DELETE /` (api/handlers/me.ts) signs the user
 * out everywhere by purging their `devices` rows. It walked `findMany` + a
 * per-row `deleteById` — one round-trip per device, on the request the user is
 * waiting on, and it removed only the rows the read happened to see (a device
 * created between the read and the loop survived the sign-out). The DataStore
 * has the set-shaped delete for exactly this (`deleteMany(table, where)`), the
 * sibling nightly job in the same slice purges sessions with it, and the
 * scheduled-tasks example names the loop as the anti-pattern
 * ("deleteMany is one round-trip vs findMany + per-row deleteById").
 *
 * This drives the REAL exported router (only the bonds are mocked) and pins
 * the purge to ONE set delete: no per-row reads, no per-row deletes.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const database = vi.hoisted(() => ({
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))

type Handle = (req: unknown, res: unknown, next?: () => void) => Promise<void> | void

/** The DELETE / middleware chain, in order, straight off the real router. */
const { deleteMiddlewares } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/auth/account-deletion/api/handlers/me.js')) as {
      default: {
        stack: Array<{
          route?: { methods: Record<string, boolean>; stack: Array<{ handle: Handle }> }
        }>
      }
    }
  const layer = mod.default.stack.find(
    (l) => l.route !== undefined && l.route.methods.delete === true,
  )
  if (!layer?.route) throw new Error('me router exported no DELETE route')
  return { deleteMiddlewares: layer.route.stack.map((l) => l.handle) }
})()

/**
 * Run the full chain as one DELETE request with a session, an email-confirm
 * body, and the owner's row in the store.
 */
async function deleteAccount(userId: string): Promise<{
  statusCode: number
  body: unknown
}> {
  database.findById.mockResolvedValue({ id: userId, email: 'user@example.com' })
  database.updateById.mockResolvedValue({ data: null, affected: 1 })
  database.deleteMany.mockResolvedValue({ data: [], affected: 2 })
  const res = {
    locals: { session: { userId } },
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  const req = { body: { confirm_email: 'user@example.com' } }
  let index = 0
  const runNext = async (): Promise<void> => {
    const handle = deleteMiddlewares[index++]
    await handle(req, res, () => void runNext())
  }
  await runNext()
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('account-deletion DELETE / — the session purge is one set delete', () => {
  it('purges every device row with ONE deleteMany — never a read plus a per-row delete loop', async () => {
    const res = await deleteAccount('user-1')

    expect(res.statusCode).toBe(0) // 200 — json() only, no status() call
    expect(res.body).toEqual({ ok: true, scheduled: 'hard delete in 30 days' })
    // One round-trip, keyed on the session's user — the whole point of the fix.
    expect(database.deleteMany).toHaveBeenCalledTimes(1)
    expect(database.deleteMany).toHaveBeenCalledWith('devices', [
      { field: 'userId', operator: '=', value: 'user-1' },
    ])
    // The N+1 shape these two assert against: a read feeding a per-row delete
    // loop paid one round-trip per device and signed out only the rows it saw.
    expect(database.findMany).not.toHaveBeenCalled()
    expect(database.deleteById).not.toHaveBeenCalled()
  })

  it('several live devices are still one query, and the soft-delete marker is stamped first', async () => {
    // findMany answering rows here proves nothing about the purge — a handler
    // that still read them would loop; the assertions above fail it either way.
    // They stay stubbed so the OLD shape (findMany → loop deleteById) would at
    // least complete and be caught by the call-shape assertions.
    database.findMany.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }])

    await deleteAccount('user-2')

    expect(database.deleteMany).toHaveBeenCalledTimes(1)
    expect(database.deleteMany).toHaveBeenCalledWith('devices', [
      { field: 'userId', operator: '=', value: 'user-2' },
    ])
    expect(database.deleteById).not.toHaveBeenCalled()
    // The marker is what the nightly job selects on, so it must be written.
    expect(database.updateById).toHaveBeenCalledWith('users', 'user-2', {
      deleted_at: expect.any(String),
      deletion_requested_by: 'user-2',
    })
  })
})
