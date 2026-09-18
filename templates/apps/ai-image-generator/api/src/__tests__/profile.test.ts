import type { Request, Response, Router } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Identity comes from the session (res.locals), never the URL/body.
const getUserId = vi.fn<() => string | null>(() => null)

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => getUserId(),
  idParamSchema: {},
}))

// findById returns the looked-up user (with PII); query returns aggregate counts.
const findById = vi.fn(async () => ({
  id: 'victim-id',
  email: 'victim@example.com',
  name: 'Victim',
  username: 'victim',
  oauthData: { bio: 'hello' },
}))
const query = vi.fn(async () => ({ rows: [{ count: 3 }] }))

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...(args as [])),
  query: (...args: unknown[]) => query(...(args as [])),
  updateById: vi.fn(async () => ({ data: {} })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Validation middleware is pass-through for this test.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

interface CapturedRes {
  statusCode: number
  body: unknown
}

function makeRes(): { res: Response; captured: CapturedRes } {
  const captured: CapturedRes = { statusCode: 200, body: undefined }
  const res = {
    locals: {},
    status(code: number) {
      captured.statusCode = code
      return this
    },
    json(payload: unknown) {
      captured.body = payload
      return this
    },
  } as unknown as Response
  return { res, captured }
}

// Walk the express router stack and invoke the handler chain for a method+path.
async function invokeRoute(
  router: Router,
  method: string,
  path: string,
  req: Request,
  res: Response,
) {
  const stack = (
    router as unknown as {
      stack: Array<{
        route?: {
          path: string
          methods: Record<string, boolean>
          stack: Array<{
            handle: (req: Request, res: Response, next: (err?: unknown) => void) => unknown
          }>
        }
      }>
    }
  ).stack
  const layer = stack.find((l) => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`route not found: ${method.toUpperCase()} ${path}`)
  for (const h of layer.route.stack) {
    let calledNext = false
    await h.handle(req, res, () => {
      calledNext = true
    })
    if (!calledNext) break
  }
}

describe('profile handler — IDOR / PII exposure', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    findById.mockResolvedValue({
      id: 'victim-id',
      email: 'victim@example.com',
      name: 'Victim',
      username: 'victim',
      oauthData: { bio: 'hello' },
    })
    query.mockResolvedValue({ rows: [{ count: 3 }] })
    getUserId.mockReturnValue(null)
  })

  it('GET /:id (public lookup) does NOT leak email, even for an anonymous caller', async () => {
    const { default: router } = await import('../handlers/profile.js')
    const req = { params: { id: 'victim-id' } } as unknown as Request
    const { res, captured } = makeRes()

    await invokeRoute(router, 'get', '/:id', req, res)

    expect(captured.statusCode).toBe(200)
    expect(captured.body).toMatchObject({ id: 'victim-id', handle: 'victim', creations: 3 })
    // The vulnerability: arbitrary :id must never expose the user's email.
    expect((captured.body as Record<string, unknown>).email).toBeUndefined()
  })

  it('GET /me (authenticated self) DOES include the email for the session user', async () => {
    getUserId.mockReturnValue('victim-id')
    const { default: router } = await import('../handlers/profile.js')
    const req = {} as unknown as Request
    const { res, captured } = makeRes()

    await invokeRoute(router, 'get', '/me', req, res)

    expect(captured.statusCode).toBe(200)
    expect((captured.body as Record<string, unknown>).email).toBe('victim@example.com')
  })
})
