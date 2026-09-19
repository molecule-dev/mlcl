import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks for all @molecule/* deps the issues handler imports -------------

let currentUserId: string | null = 'author-1'
const paramId = 'issue-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: () => paramId,
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

// --- Test helpers ---------------------------------------------------------

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
): Promise<MockRes> {
  const res = makeRes()
  await new Promise<void>((resolve, reject) => {
    const req = { method, url, body, query: {}, params: {} } as unknown as Request
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

describe('issues GET /:id visibility scoping', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    const mod = await import('../handlers/issues.js')
    router = mod.default as unknown as typeof router
  })

  it('returns a published issue to an anonymous reader', async () => {
    db.findById.mockResolvedValue({ id: 'issue-1', status: 'published', author_id: 'author-1' })
    currentUserId = null
    const res = await dispatch(router, 'GET', '/issue-1')
    expect(res.statusCode).toBe(200)
  })

  it('returns a draft to its author', async () => {
    db.findById.mockResolvedValue({ id: 'issue-1', status: 'draft', author_id: 'author-1' })
    const res = await dispatch(router, 'GET', '/issue-1')
    expect(res.statusCode).toBe(200)
  })

  it('404s a draft for anyone else (no draft probing)', async () => {
    db.findById.mockResolvedValue({ id: 'issue-1', status: 'draft', author_id: 'author-1' })
    currentUserId = 'someone-else'
    const res = await dispatch(router, 'GET', '/issue-1')
    expect(res.statusCode).toBe(404)
  })

  it('404s a missing issue', async () => {
    db.findById.mockResolvedValue(null)
    const res = await dispatch(router, 'GET', '/issue-1')
    expect(res.statusCode).toBe(404)
  })
})

describe('issues POST / (create + one-shot publish)', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    const mod = await import('../handlers/issues.js')
    router = mod.default as unknown as typeof router
  })

  it('creates a draft with status defaulting to draft', async () => {
    db.create.mockResolvedValue({
      data: { id: 'issue-9', status: 'draft', subject: 's' },
    })
    const res = await dispatch(router, 'POST', '/', {
      subject: 'Draft subject',
      body_md: 'Hello',
    })
    expect(res.statusCode).toBe(201)
    const [table, payload] = db.create.mock.calls[0] as [string, Record<string, unknown>]
    expect(table).toBe('issues')
    expect(payload.status).toBe('draft')
    expect(payload.publish_at).toBeNull()
  })

  it('publishing in one shot fans delivery out to subscribed subscribers', async () => {
    db.create.mockResolvedValue({
      data: { id: 'issue-9', status: 'published', subject: 's' },
    })
    // deliverIssueToSubscribers reads the issue back, then the subscribers.
    db.findById.mockResolvedValue({ id: 'issue-9', status: 'published', author_id: 'author-1' })
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'subscribers') return [{ id: 'sub-1' }, { id: 'sub-2' }]
      return []
    })
    const res = await dispatch(router, 'POST', '/', {
      subject: 'Send me',
      body_md: 'Hello',
      status: 'published',
    })
    expect(res.statusCode).toBe(201)
    const [table, payload] = db.create.mock.calls[0] as [string, Record<string, unknown>]
    expect(table).toBe('issues')
    expect(payload.status).toBe('published')
    expect(payload.publish_at).toEqual(expect.any(String))
    // One sends row per subscribed subscriber.
    const sendCalls = db.create.mock.calls.filter(([t]) => t === 'sends')
    expect(sendCalls).toHaveLength(2)
    for (const [, p] of sendCalls) {
      expect(p).toMatchObject({ issue_id: 'issue-9', opened_at: null, clicked_at: null })
    }
  })

  it('401s without a user', async () => {
    currentUserId = null
    const res = await dispatch(router, 'POST', '/', { subject: 'x' })
    expect(res.statusCode).toBe(401)
  })
})

describe('issues POST /:id/publish (owner gate + delivery)', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    const mod = await import('../handlers/issues.js')
    router = mod.default as unknown as typeof router
  })

  it('publishes an owned draft and delivers', async () => {
    // findById serves BOTH the owner check (sees the pre-publish draft) and
    // the delivery read-back (must see the row as published, i.e. the state
    // after publishIssue's updateById) — mock the post-publish state.
    db.findById.mockResolvedValue({ id: 'issue-1', status: 'published', author_id: 'author-1' })
    db.findMany.mockImplementation(async (table: string) => {
      if (table === 'subscribers') return [{ id: 'sub-1' }]
      return []
    })
    const res = await dispatch(router, 'POST', '/issue-1/publish')
    expect(res.statusCode).toBe(200)
    const [table, id, payload] = db.updateById.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ]
    expect(table).toBe('issues')
    expect(id).toBe('issue-1')
    expect(payload.status).toBe('published')
    expect(db.create.mock.calls.some(([t]) => t === 'sends')).toBe(true)
  })

  it('403s a non-owner', async () => {
    db.findById.mockResolvedValue({ id: 'issue-1', status: 'draft', author_id: 'author-1' })
    currentUserId = 'someone-else'
    const res = await dispatch(router, 'POST', '/issue-1/publish')
    expect(res.statusCode).toBe(403)
  })
})
