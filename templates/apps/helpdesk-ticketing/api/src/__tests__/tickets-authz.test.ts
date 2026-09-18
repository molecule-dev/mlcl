import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Operator is designated via ADMIN_EMAILS, read at module-eval time of require-admin.
process.env.ADMIN_EMAILS = 'owner@helpdesk.com'

// A ticket owned by user-2; replies mix a public + an internal (operator-only) note.
const TICKET = { id: 'ticket-1', requester_id: 'user-2', subject: 's', status: 'open' }
const REPLIES = [
  { id: 'r1', ticket_id: 'ticket-1', is_internal: false, body: 'public reply' },
  { id: 'r2', ticket_id: 'ticket-1', is_internal: true, body: 'INTERNAL triage note' },
]

const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'op@example.com', role: 'admin' }
    if (id === 'user-1') return { id, email: 'customer@example.com', role: 'user' }
    if (id === 'user-2') return { id, email: 'owner-customer@example.com', role: 'user' }
    return null
  }
  if (table === 'tickets') return id === TICKET.id ? { ...TICKET } : null
  return { id }
})
const findMany = vi.fn(async (table: string, _opts?: unknown) =>
  table === 'ticket_replies' ? REPLIES.map((r) => ({ ...r })) : [{ ...TICKET }],
)
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const create = vi.fn(async (_t: string, row: Record<string, unknown>) => ({
  data: { id: 'new', ...row },
}))
const count = vi.fn(async (..._a: unknown[]) => 0)

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
  findMany: (...a: unknown[]) => findMany(a[0] as string, a[1]),
  updateById: (...a: unknown[]) => updateById(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  create: (...a: unknown[]) => create(a[0] as string, a[1] as Record<string, unknown>),
  count: (...a: unknown[]) => count(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const tickets = (await import('../handlers/tickets.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/tickets', tickets)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
})
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())))
})
beforeEach(() => vi.clearAllMocks())

const call = (method: string, path: string, user?: string, body?: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(user ? { 'x-test-user': user } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

describe('tickets authorization (P5TPL-01)', () => {
  it('anonymous callers get 401 on every endpoint', async () => {
    expect((await call('GET', '/tickets')).status).toBe(401)
    expect((await call('GET', '/tickets/ticket-1')).status).toBe(401)
    expect((await call('PATCH', '/tickets/ticket-1', undefined, {})).status).toBe(401)
    expect((await call('DELETE', '/tickets/ticket-1')).status).toBe(401)
  })

  it('GET / scopes a non-operator to their own requester_id', async () => {
    await call('GET', '/tickets', 'user-1')
    const where =
      (
        findMany.mock.calls.find((c) => c[0] === 'tickets')?.[1] as unknown as
          { where?: unknown[] } | undefined
      )?.where ?? []
    expect(where).toContainEqual({ field: 'requester_id', operator: '=', value: 'user-1' })
  })

  it('GET / does NOT scope an operator (sees the whole queue)', async () => {
    await call('GET', '/tickets', 'admin-1')
    const where =
      (
        findMany.mock.calls.find((c) => c[0] === 'tickets')?.[1] as unknown as
          { where?: unknown[] } | undefined
      )?.where ?? []
    expect(where).not.toContainEqual({ field: 'requester_id', operator: '=', value: 'admin-1' })
  })

  it('GET /:id returns 404 for a non-owner non-operator (no existence leak)', async () => {
    expect((await call('GET', '/tickets/ticket-1', 'user-1')).status).toBe(404)
  })

  it('GET /:id returns the ticket to its owner but hides internal replies', async () => {
    const res = await call('GET', '/tickets/ticket-1', 'user-2')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { replies: Array<{ body: string }> }
    expect(json.replies).toHaveLength(1)
    expect(json.replies[0]?.body).toBe('public reply')
  })

  it('GET /:id returns internal replies to an operator', async () => {
    const res = await call('GET', '/tickets/ticket-1', 'admin-1')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { replies: unknown[] }
    expect(json.replies).toHaveLength(2)
  })

  it('PATCH /:id is 404 for a non-owner and never mutates', async () => {
    expect((await call('PATCH', '/tickets/ticket-1', 'user-1', { status: 'closed' })).status).toBe(
      404,
    )
    expect(updateById).not.toHaveBeenCalled()
  })

  it('PATCH /:id by the owning customer drops operator-only fields (assignee_id/priority) and keeps category + close (P5TPL-02)', async () => {
    // user-2 owns TICKET; as a non-operator they may close + recategorise their
    // own ticket but must NOT mass-assign assignee_id or change priority.
    const res = await call('PATCH', '/tickets/ticket-1', 'user-2', {
      assignee_id: 'admin-1',
      priority: 'urgent',
      status: 'closed',
      category: 'billing',
    })
    expect(res.status).toBe(200)
    const patch = updateById.mock.calls.find(
      (c) => c[0] === 'tickets' && c[1] === 'ticket-1',
    )?.[2] as Record<string, unknown>
    expect(patch).toBeDefined()
    expect(patch.category).toBe('billing')
    expect(patch.status).toBe('closed')
    expect(patch).not.toHaveProperty('assignee_id')
    expect(patch).not.toHaveProperty('priority')
  })

  it('PATCH /:id by the owning customer ignores a non-open/closed status transition (P5TPL-02)', async () => {
    const res = await call('PATCH', '/tickets/ticket-1', 'user-2', { status: 'resolved' })
    expect(res.status).toBe(200)
    const patch = updateById.mock.calls.find(
      (c) => c[0] === 'tickets' && c[1] === 'ticket-1',
    )?.[2] as Record<string, unknown>
    expect(patch).not.toHaveProperty('status')
  })

  it('PATCH /:id by an operator keeps the full writable set (assignee_id/priority/status) (P5TPL-02)', async () => {
    const res = await call('PATCH', '/tickets/ticket-1', 'admin-1', {
      assignee_id: 'admin-1',
      priority: 'urgent',
      status: 'pending',
    })
    expect(res.status).toBe(200)
    const patch = updateById.mock.calls.find(
      (c) => c[0] === 'tickets' && c[1] === 'ticket-1',
    )?.[2] as Record<string, unknown>
    expect(patch.assignee_id).toBe('admin-1')
    expect(patch.priority).toBe('urgent')
    expect(patch.status).toBe('pending')
  })

  it('DELETE /:id is 404 for any non-operator (even the owner) and never deletes', async () => {
    expect((await call('DELETE', '/tickets/ticket-1', 'user-2')).status).toBe(404)
    expect(deleteById).not.toHaveBeenCalled()
  })

  it('DELETE /:id succeeds for an operator', async () => {
    expect((await call('DELETE', '/tickets/ticket-1', 'admin-1')).status).toBe(204)
    expect(deleteById).toHaveBeenCalledWith('tickets', 'ticket-1')
  })

  it('POST /:id/replies blocks a non-owner and forces is_internal=false for a customer', async () => {
    expect((await call('POST', '/tickets/ticket-1/replies', 'user-1', { body: 'x' })).status).toBe(
      404,
    )
    await call('POST', '/tickets/ticket-1/replies', 'user-2', { body: 'x', is_internal: true })
    const replyCreate = create.mock.calls.find((c) => c[0] === 'ticket_replies')
    expect((replyCreate?.[1] as { is_internal?: boolean })?.is_internal).toBe(false)
  })
})
