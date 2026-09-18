import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for L2-3 (CWE-209, information exposure through error message):
// the profile handler's 500 catch block used to echo the raw exception text back
// to the client via a `message: err instanceof Error ? err.message : String(err)`
// field alongside the generic error. A DB-layer failure (e.g. a UNIQUE constraint
// violation) therefore leaked table/constraint/driver details to any authenticated
// caller. The fix strips the `message` field so only the generic i18n
// `errors.internalServer` string is returned, while the real error is still logged
// server-side via logger.error.

const findById = vi.fn()
const query = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  query: (...args: unknown[]) => query(...args),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId: string | null }).userId,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

const loggerError = vi.fn()
vi.mock('@molecule/api-logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: (...a: unknown[]) => loggerError(...a),
    debug: vi.fn(),
    trace: vi.fn(),
  },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

type RouteLayer = {
  route?: {
    path: string
    methods: Record<string, boolean>
    stack: { handle: (req: Request, res: Response) => Promise<void> | void }[]
  }
}

function makeRes(userId: string | null) {
  const res = {
    locals: { userId },
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}

async function callGetMe(router: { stack: RouteLayer[] }, userId: string | null) {
  const layer = router.stack.find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / route not found')
  const req = { params: {}, body: {}, query: {} } as unknown as Request
  const res = makeRes(userId)
  await layer.route.stack[layer.route.stack.length - 1].handle(req, res)
  return res
}

const DB_LEAK = 'duplicate key value violates unique constraint "users_email_key"'

describe('profile: GET /me does not leak internal error details (L2-3 CWE-209)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns a generic 500 with NO raw error text when the DB layer throws', async () => {
    const router = (await import('../handlers/profile.js')).default as unknown as {
      stack: RouteLayer[]
    }
    findById.mockRejectedValue(new Error(DB_LEAK))

    const res = await callGetMe(router, 'u1')

    expect(res.statusCode).toBe(500)
    const body = res.body as Record<string, unknown>
    // generic error preserved
    expect(body.error).toBe('Internal server error')
    // the leak is closed: no message field, no raw driver text anywhere in the body
    expect(body.message).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('users_email_key')
    expect(JSON.stringify(body)).not.toContain('duplicate key')
    // ...but the real error is still captured server-side
    expect(loggerError).toHaveBeenCalledWith(expect.objectContaining({ message: DB_LEAK }))
  })

  it('still serves the profile normally on a legitimate request', async () => {
    const router = (await import('../handlers/profile.js')).default as unknown as {
      stack: RouteLayer[]
    }
    findById.mockResolvedValue({
      id: 'u1',
      name: 'Ada',
      email: 'ada@example.com',
      username: 'ada',
      planKey: 'pro',
    })

    const res = await callGetMe(router, 'u1')

    expect(res.statusCode).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.id).toBe('u1')
    expect(body.email).toBe('ada@example.com')
  })
})
