import crypto from 'crypto'
import express from 'express'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Shared, inspectable DataStore mocks. Routed by table name so the same fn can
// serve both the `webhook_events` and `sent_emails` reads.
const dbMocks = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: dbMocks.create,
  findById: dbMocks.findById,
  findMany: dbMocks.findMany,
  updateById: dbMocks.updateById,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

// Mirror the real bond helpers: identity comes from the session, never the body.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: { locals?: { session?: { userId?: string } } }) =>
    res.locals?.session?.userId ?? null,
  getParamId: (req: { params: Record<string, string | string[]> }, name = 'id') => {
    const v = req.params[name]
    return Array.isArray(v) ? v[0] : v
  },
}))

const WEBHOOK_KEY = 'test-mailgun-signing-key'
process.env.MAILGUN_WEBHOOK_SIGNING_KEY = WEBHOOK_KEY

// `sessionUserId` is read by the test middleware to populate res.locals.session.
let sessionUserId: string | undefined
let server: Server
let baseUrl: string

beforeAll(async () => {
  const { default: webhooks } = await import('../handlers/webhooks.js')
  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    res.locals.session = sessionUserId ? { userId: sessionUserId } : undefined
    next()
  })
  app.use('/webhooks', webhooks)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

beforeEach(() => {
  vi.clearAllMocks()
  sessionUserId = undefined
})

function signMailgun(timestamp: string, token: string): string {
  return crypto
    .createHmac('sha256', WEBHOOK_KEY)
    .update(timestamp + token)
    .digest('hex')
}

describe('webhooks — tenant-scoped audit log (TPL-001)', () => {
  it('GET / scopes the query to the caller user_id', async () => {
    sessionUserId = 'user-A'
    dbMocks.findMany.mockResolvedValueOnce([{ id: 'evt-1', user_id: 'user-A' }])

    const res = await fetch(`${baseUrl}/webhooks`)
    expect(res.status).toBe(200)

    expect(dbMocks.findMany).toHaveBeenCalledTimes(1)
    const [table, opts] = dbMocks.findMany.mock.calls[0] as [string, { where: unknown[] }]
    expect(table).toBe('webhook_events')
    expect(opts.where).toContainEqual({ field: 'user_id', operator: '=', value: 'user-A' })
  })

  it('GET / returns 401 without a session', async () => {
    const res = await fetch(`${baseUrl}/webhooks`)
    expect(res.status).toBe(401)
    expect(dbMocks.findMany).not.toHaveBeenCalled()
  })

  it('GET /:id returns 404 for a cross-owner event (no PII leak, not probeable)', async () => {
    sessionUserId = 'user-A'
    dbMocks.findById.mockResolvedValueOnce({
      id: 'evt-9',
      user_id: 'user-B',
      payload: { recipient: 'victim@example.test' },
    })

    const res = await fetch(`${baseUrl}/webhooks/evt-9`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.recipient).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('victim@example.test')
  })

  it('GET /:id returns the event to its owner', async () => {
    sessionUserId = 'user-A'
    dbMocks.findById.mockResolvedValueOnce({ id: 'evt-1', user_id: 'user-A' })

    const res = await fetch(`${baseUrl}/webhooks/evt-1`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe('evt-1')
  })

  it('POST /mailgun stamps the matched send owner onto the audit event', async () => {
    const timestamp = '1700000000'
    const token = 'tok-123'
    const signature = signMailgun(timestamp, token)

    dbMocks.create.mockResolvedValueOnce({ data: { id: 'evt-new' } })
    dbMocks.findMany.mockResolvedValueOnce([{ id: 'sent-1', user_id: 'owner-X' }])
    dbMocks.updateById.mockResolvedValue({ data: {} })

    const res = await fetch(`${baseUrl}/webhooks/mailgun`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        signature: { timestamp, token, signature },
        'event-data': {
          event: 'delivered',
          recipient: 'r@example.test',
          message: { headers: { 'message-id': 'mid-1' } },
        },
      }),
    })
    expect(res.status).toBe(200)

    expect(dbMocks.updateById).toHaveBeenCalledWith('webhook_events', 'evt-new', {
      user_id: 'owner-X',
    })
  })
})
