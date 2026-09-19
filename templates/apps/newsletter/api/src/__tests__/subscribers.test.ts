import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let currentUserId: string | null = 'author-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: () => 'sub-1',
}))

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => db.findById(...args),
  updateById: (...args: unknown[]) => db.updateById(...args),
  deleteById: (...args: unknown[]) => db.deleteById(...args),
  create: (...args: unknown[]) => db.create(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
  count: (...args: unknown[]) => db.count(...args),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

interface MockRes {
  statusCode: number
  body: unknown
  ended: boolean
  status: (code: number) => MockRes
  json: (payload: unknown) => MockRes
  end: () => MockRes
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
  return res
}

async function dispatch(
  router: (req: Request, res: Response, next: (err?: unknown) => void) => void,
  method: string,
  url: string,
  body: Record<string, unknown> = {},
  query: Record<string, string> = {},
): Promise<MockRes> {
  const res = makeRes()
  await new Promise<void>((resolve, reject) => {
    const req = { method, url, body, query, params: {} } as unknown as Request
    router(req, res as unknown as Response, (err?: unknown) => {
      if (err) reject(err)
      else resolve()
    })
    const start = Date.now()
    const check = (): void => {
      if (res.ended || res.body !== undefined) resolve()
      else if (Date.now() - start > 2000) reject(new Error('handler timeout'))
      else setTimeout(check, 5)
    }
    check()
  })
  return res
}

beforeEach(async () => {
  vi.resetAllMocks()
  currentUserId = 'author-1'
  db.findMany.mockResolvedValue([])
  db.count.mockResolvedValue(0)
  db.create.mockResolvedValue({ data: {} })
  db.updateById.mockResolvedValue({ data: {} })
  db.findById.mockResolvedValue(null)
})

describe('makeSubscriberToken', () => {
  it('is deterministic, 32 hex chars, and distinct per id', async () => {
    const { makeSubscriberToken } = await import('../handlers/subscribers.js')
    const a = makeSubscriberToken('11111111-1111-1111-1111-111111111111')
    expect(a).toBe(makeSubscriberToken('11111111-1111-1111-1111-111111111111'))
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toBe(makeSubscriberToken('22222222-2222-2222-2222-222222222222'))
  })
})

describe('subscribers POST /subscribe (public form)', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    const mod = await import('../handlers/subscribers.js')
    router = mod.default as unknown as typeof router
  })

  it('creates a subscribed free subscriber with source landing and stamps its token', async () => {
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'subscribers') return []
      return []
    })
    db.create.mockResolvedValue({
      data: { id: 'sub-9', email: 'reader@example.com', status: 'subscribed' },
    })
    const res = await dispatch(router, 'POST', '/subscribe', {
      email: 'reader@example.com',
    })
    expect(res.statusCode).toBe(201)
    const [table, payload] = db.create.mock.calls[0] as [string, Record<string, unknown>]
    expect(table).toBe('subscribers')
    expect(payload).toMatchObject({
      email: 'reader@example.com',
      status: 'subscribed',
      tier: 'free',
      source: 'landing',
    })
    // Second write stamps the deterministic token derived from the id.
    const tokenCall = db.updateById.mock.calls.find(
      ([t, , p]) =>
        t === 'subscribers' &&
        typeof p === 'object' &&
        p !== null &&
        'token' in (p as Record<string, unknown>),
    ) as [string, string, Record<string, unknown>] | undefined
    expect(tokenCall).toBeDefined()
    expect(tokenCall?.[1]).toBe('sub-9')
    expect(tokenCall?.[2].token).toMatch(/^[0-9a-f]{32}$/)
  })

  it('re-subscribes an existing unsubscribed email (idempotent)', async () => {
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'subscribers')
        return [{ id: 'sub-1', email: 'reader@example.com', status: 'unsubscribed' }]
      return []
    })
    const res = await dispatch(router, 'POST', '/subscribe', {
      email: 'reader@example.com',
    })
    expect(res.statusCode).toBe(200)
    expect(db.create).not.toHaveBeenCalled()
    const [table, id, payload] = db.updateById.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ]
    expect(table).toBe('subscribers')
    expect(id).toBe('sub-1')
    expect(payload.status).toBe('subscribed')
  })
})

describe('subscribers GET /unsubscribe/:token (public)', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    const mod = await import('../handlers/subscribers.js')
    router = mod.default as unknown as typeof router
  })

  it('flips the matching subscriber to unsubscribed', async () => {
    const { makeSubscriberToken } = await import('../handlers/subscribers.js')
    const token = makeSubscriberToken('sub-1')
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'subscribers')
        return [{ id: 'sub-1', email: 'reader@example.com', status: 'subscribed', token }]
      return []
    })
    const res = await dispatch(router, 'GET', `/unsubscribe/${token}`, {}, {})
    expect(res.statusCode).toBe(200)
    const [table, id, payload] = db.updateById.mock.calls.find(
      ([t, , p]) => t === 'subscribers' && (p as Record<string, unknown>).status === 'unsubscribed',
    ) as [string, string, Record<string, unknown>]
    expect(table).toBe('subscribers')
    expect(id).toBe('sub-1')
    expect(payload.status).toBe('unsubscribed')
  })

  it('records the click on the issue send when ?issue= is present', async () => {
    const { makeSubscriberToken } = await import('../handlers/subscribers.js')
    const token = makeSubscriberToken('sub-1')
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'subscribers')
        return [{ id: 'sub-1', email: 'reader@example.com', status: 'subscribed', token }]
      if (table === 'sends')
        return [
          {
            id: 'send-1',
            issue_id: 'issue-1',
            subscriber_id: 'sub-1',
            opened_at: '2026-01-01T00:00:00.000Z',
            clicked_at: null,
          },
        ]
      return []
    })
    const res = await dispatch(router, 'GET', `/unsubscribe/${token}`, {}, { issue: 'issue-1' })
    expect(res.statusCode).toBe(200)
    const clickCall = db.updateById.mock.calls.find(
      ([t, , p]) =>
        t === 'sends' &&
        typeof p === 'object' &&
        p !== null &&
        'clicked_at' in (p as Record<string, unknown>),
    ) as [string, string, Record<string, unknown>] | undefined
    expect(clickCall).toBeDefined()
    expect(clickCall?.[1]).toBe('send-1')
    expect(clickCall?.[2].clicked_at).toEqual(expect.any(String))
  })

  it('404s an unknown token', async () => {
    db.findMany.mockResolvedValue([])
    const res = await dispatch(router, 'GET', '/unsubscribe/deadbeef', {}, {})
    expect(res.statusCode).toBe(404)
  })
})

describe('subscribers POST / (manual add)', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    const mod = await import('../handlers/subscribers.js')
    router = mod.default as unknown as typeof router
  })

  it('creates a subscribed manual-add subscriber', async () => {
    db.findMany.mockResolvedValue([])
    db.create.mockResolvedValue({
      data: { id: 'sub-2', email: 'vip@example.com', status: 'subscribed' },
    })
    const res = await dispatch(router, 'POST', '/', {
      email: 'vip@example.com',
      tier: 'paid',
    })
    expect(res.statusCode).toBe(201)
    const [table, payload] = db.create.mock.calls[0] as [string, Record<string, unknown>]
    expect(table).toBe('subscribers')
    expect(payload).toMatchObject({ email: 'vip@example.com', tier: 'paid', source: 'manual' })
  })

  it('409s a duplicate email', async () => {
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'subscribers')
        return [{ id: 'sub-1', email: 'vip@example.com', status: 'subscribed' }]
      return []
    })
    const res = await dispatch(router, 'POST', '/', { email: 'vip@example.com' })
    expect(res.statusCode).toBe(409)
  })
})
