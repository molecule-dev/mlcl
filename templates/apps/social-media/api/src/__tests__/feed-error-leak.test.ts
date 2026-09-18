import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for L2-3 (CWE-209, information exposure through error message):
// the feed handler's 500 catch block used the raw exception text AS the client-facing
// error value: `error: (err as Error).message || t('errors.internalServer', ...)`. Any
// DB-layer failure therefore leaked driver/schema details to the caller. The fix
// returns only the generic i18n `errors.internalServer` string and logs the real
// error server-side (console.error).

const findMany = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findMany: (...args: unknown[]) => findMany(...args),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) => (res.locals as { userId: string | null }).userId,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

const enrichPosts = vi.fn()
vi.mock('../lib/enrich-posts.js', () => ({
  enrichPosts: (...args: unknown[]) => enrichPosts(...args),
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

async function callGetFeed(router: { stack: RouteLayer[] }, userId: string | null) {
  const layer = router.stack.find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / route not found')
  const req = { params: {}, body: {}, query: {} } as unknown as Request
  const res = makeRes(userId)
  await layer.route.stack[layer.route.stack.length - 1].handle(req, res)
  return res
}

const DB_LEAK = 'relation "user_follows" does not exist'

describe('feed: GET / does not leak internal error details (L2-3 CWE-209)', () => {
  let errSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.resetAllMocks()
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('returns a generic 500 with NO raw error text when the DB layer throws', async () => {
    const router = (await import('../handlers/feed.js')).default as unknown as {
      stack: RouteLayer[]
    }
    findMany.mockRejectedValue(new Error(DB_LEAK))

    const res = await callGetFeed(router, 'u1')

    expect(res.statusCode).toBe(500)
    const body = res.body as Record<string, unknown>
    expect(body.error).toBe('Internal server error')
    expect(JSON.stringify(body)).not.toContain('user_follows')
    expect(JSON.stringify(body)).not.toContain('does not exist')
    // the real error is still captured server-side
    expect(errSpy).toHaveBeenCalled()
  })

  it('still serves the feed normally on a legitimate request', async () => {
    const router = (await import('../handlers/feed.js')).default as unknown as {
      stack: RouteLayer[]
    }
    findMany.mockResolvedValue([])
    enrichPosts.mockResolvedValue([{ id: 'p1' }])

    const res = await callGetFeed(router, 'u1')

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([{ id: 'p1' }])
  })
})
