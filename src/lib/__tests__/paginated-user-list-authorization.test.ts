/**
 * The paginated-user-list example's `GET /users` lists EVERY row of the users
 * table — the one table whose every row is PII (an email address at minimum).
 * The framework's own User resource ships no list route for exactly that
 * reason (its only reads are authSelf-gated `/users/:id` routes, and signup is
 * public, so no app-wide gate protects a hand-mounted handler), which makes
 * the example's route the authorization point: an ungated copy is a public
 * directory of every user's email address.
 *
 * This drives the REAL exported router (only the @molecule bonds are mocked —
 * the auth gate, the query validation and the handler are the shipped code):
 * unauthenticated → 401 and the database is never queried; authenticated →
 * the paginated list.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const database = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }))

vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  // Stand-in for the real middleware's contract: parsed query values land on
  // req.query before next() — here the schema's own defaults.
  validateQuery:
    () =>
    (req: { query: Record<string, unknown> }, _res: unknown, next: () => void): void => {
      req.query = { page: 1, limit: 20 }
      next()
    },
}))

type Handle = (req: unknown, res: unknown, next?: () => void) => Promise<void> | void

/** The GET / middleware chain, in order, straight off the real router. */
const { listMiddlewares } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/data-display/paginated-user-list/api/handlers/users.js')) as {
      default: {
        stack: Array<{
          route?: { methods: Record<string, boolean>; stack: Array<{ handle: Handle }> }
        }>
      }
    }
  const layer = mod.default.stack.find((l) => l.route !== undefined && l.route.methods.get === true)
  if (!layer?.route) throw new Error('users router exported no GET route')
  return { listMiddlewares: layer.route.stack.map((l) => l.handle) }
})()

const makeRes = (): {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  status: (code: number) => unknown
  json: (payload: unknown) => unknown
} => {
  const res = {
    locals: {} as { session?: { userId: string } },
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
  return res
}

/** Run the full middleware chain and await the terminal handler. */
async function get(args: { userId?: string }): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  if (args.userId !== undefined) res.locals.session = { userId: args.userId }
  const req = { query: {} as Record<string, unknown> }
  let index = 0
  const runNext = async (): Promise<void> => {
    const handle = listMiddlewares[index++]
    await handle(req, res, () => void runNext())
  }
  await runNext()
  return res
}

beforeEach(() => {
  database.findMany.mockReset()
  database.count.mockReset()
})

describe('paginated-user-list — the full user table is never served unauthenticated', () => {
  it('a request with no session is 401 and never queries the users table', async () => {
    const res = await get({})
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Authentication required' })
    expect(database.findMany).not.toHaveBeenCalled()
    expect(database.count).not.toHaveBeenCalled()
  })

  it('an authenticated request returns the paginated list', async () => {
    database.findMany.mockResolvedValue([{ id: 'u1' }])
    database.count.mockResolvedValue(1)
    const res = await get({ userId: 'user-1' })
    expect(res.statusCode).toBe(0) // 200 — no status() call, json() only
    expect(database.findMany).toHaveBeenCalledTimes(1)
    expect(res.body).toEqual({ data: [{ id: 'u1' }], total: 1, page: 1, limit: 20 })
  })
})
