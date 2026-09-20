import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Staff is designated via ADMIN_EMAILS, read at module-eval time of
// require-staff.
process.env.ADMIN_EMAILS = 'ops@riverton.gov.demo'

// An issue reported by resident-2 near 4th Ave & E 11th St.
const ISSUE = {
  id: 'issue-1',
  reporter_id: 'resident-2',
  category: 'pothole',
  description: 'bike-lane pothole',
  status: 'submitted',
  photo_url: null,
  x: 34,
  y: 27,
  derived_address: '3rd Ave & W 11th St',
  official_note: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  resolved_at: null,
}

const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'staff-1') return { id, email: 'ops@riverton.gov.demo', role: 'resident' }
    if (id === 'resident-1') return { id, email: 'neighbor@example.com', role: 'resident' }
    if (id === 'resident-2') return { id, email: 'reporter@example.com', role: 'resident' }
    return null
  }
  if (table === 'issues') return id === ISSUE.id ? { ...ISSUE } : null
  return { id }
})
const findMany = vi.fn(async (table: string, opts?: unknown) => {
  if (table === 'confirmations') {
    const o = opts as { where?: Array<{ field: string; value?: unknown }> } | undefined
    const byUser = o?.where?.find((w) => w.field === 'user_id')
    // Simulate resident-1 having already confirmed issue-1.
    if (byUser && byUser.value === 'resident-1') return [{ id: 'c0', issue_id: ISSUE.id }]
    return []
  }
  if (table === 'issue_events') return []
  if (table === 'watch_areas') return []
  return [{ ...ISSUE }]
})
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const create = vi.fn(async (_t: string, row: Record<string, unknown>) => ({
  data: { id: 'new-1', ...row },
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
  const issues = (await import('../handlers/issues.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/issues', issues)
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

describe('issues authorization', () => {
  it('anonymous callers get 401 on every endpoint', async () => {
    expect((await call('GET', '/issues')).status).toBe(401)
    expect((await call('GET', '/issues/issue-1')).status).toBe(401)
    expect((await call('PATCH', '/issues/issue-1', undefined, {})).status).toBe(401)
    expect((await call('DELETE', '/issues/issue-1')).status).toBe(401)
  })

  it('GET / is community-wide for a resident (no reporter scoping)', async () => {
    await call('GET', '/issues', 'resident-1')
    const where =
      (
        findMany.mock.calls.find((c) => c[0] === 'issues')?.[1] as unknown as
          { where?: unknown[] } | undefined
      )?.where ?? []
    expect(where).not.toContainEqual({
      field: 'reporter_id',
      operator: '=',
      value: 'resident-1',
    })
  })

  it('GET /?mine=1 scopes to the caller (MyReports)', async () => {
    await call('GET', '/issues?mine=1', 'resident-1')
    const where =
      (
        findMany.mock.calls.find((c) => c[0] === 'issues')?.[1] as unknown as
          { where?: unknown[] } | undefined
      )?.where ?? []
    expect(where).toContainEqual({ field: 'reporter_id', operator: '=', value: 'resident-1' })
  })

  it('GET /?mine=false does NOT scope (coerce-boolean trap)', async () => {
    await call('GET', '/issues?mine=false', 'resident-1')
    const where =
      (
        findMany.mock.calls.find((c) => c[0] === 'issues')?.[1] as unknown as
          { where?: unknown[] } | undefined
      )?.where ?? []
    expect(where).not.toContainEqual({
      field: 'reporter_id',
      operator: '=',
      value: 'resident-1',
    })
  })

  it('POST / derives the address server-side from the pin', async () => {
    const res = await call('POST', '/issues', 'resident-1', {
      category: 'pothole',
      description: 'new sinkhole',
      x: 34,
      y: 27,
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledWith(
      'issues',
      expect.objectContaining({ derived_address: '3rd Ave & W 11th St' }),
    )
    expect(create).toHaveBeenCalledWith(
      'issue_events',
      expect.objectContaining({ kind: 'status_change', to_status: 'submitted' }),
    )
  })

  it('POST /:id/confirmations rejects confirming your own report', async () => {
    const res = await call('POST', '/issues/issue-1/confirmations', 'resident-2')
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalledWith(
      'confirmations',
      expect.objectContaining({ user_id: 'resident-2' }),
    )
  })

  it('POST /:id/confirmations 409s on a second confirmation by the same user', async () => {
    const res = await call('POST', '/issues/issue-1/confirmations', 'resident-1')
    expect(res.status).toBe(409)
  })

  it('POST /:id/confirmations works for another resident and notifies the reporter', async () => {
    findById.mockImplementationOnce(async (table: string, id: string) =>
      table === 'issues' && id === ISSUE.id
        ? { ...ISSUE, reporter_id: 'resident-2' }
        : table === 'users' && id === 'someone-else'
          ? { id, email: 'x@example.com', role: 'resident' }
          : null,
    )
    findMany.mockImplementationOnce(async () => [])
    const res = await call('POST', '/issues/issue-1/confirmations', 'someone-else')
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ user_id: 'resident-2', kind: 'confirmation' }),
    )
  })

  it('POST /:id/comments is open to any resident', async () => {
    const res = await call('POST', '/issues/issue-1/comments', 'resident-1', {
      body: 'same over here',
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledWith(
      'issue_events',
      expect.objectContaining({ kind: 'comment', actor_id: 'resident-1' }),
    )
  })

  it('POST /:id/notes is staff-only', async () => {
    const res = await call('POST', '/issues/issue-1/notes', 'resident-1', {
      body: 'crew dispatched',
    })
    expect(res.status).toBe(403)
    expect(create).not.toHaveBeenCalledWith(
      'issue_events',
      expect.objectContaining({ kind: 'note' }),
    )
  })

  it('PATCH /:id status is staff-only', async () => {
    const res = await call('PATCH', '/issues/issue-1', 'resident-1', {
      status: 'acknowledged',
    })
    expect(res.status).toBe(403)
    expect(updateById).not.toHaveBeenCalledWith('issues', 'issue-1', expect.anything())
  })

  it('PATCH /:id rejects an illegal transition (422)', async () => {
    const res = await call('PATCH', '/issues/issue-1', 'staff-1', { status: 'resolved' })
    expect(res.status).toBe(422)
    expect(updateById).not.toHaveBeenCalledWith('issues', 'issue-1', expect.anything())
  })

  it('PATCH /:id accepts a legal transition and notifies the reporter', async () => {
    const res = await call('PATCH', '/issues/issue-1', 'staff-1', { status: 'acknowledged' })
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(
      'issue_events',
      expect.objectContaining({
        kind: 'status_change',
        from_status: 'submitted',
        to_status: 'acknowledged',
      }),
    )
    expect(create).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ user_id: 'resident-2', kind: 'status_change' }),
    )
  })

  it('DELETE /:id 404s for a non-reporter resident (no probing)', async () => {
    const res = await call('DELETE', '/issues/issue-1', 'resident-1')
    expect(res.status).toBe(404)
    expect(deleteById).not.toHaveBeenCalled()
  })

  it('DELETE /:id works for the reporter and for staff', async () => {
    expect((await call('DELETE', '/issues/issue-1', 'resident-2')).status).toBe(204)
    expect((await call('DELETE', '/issues/issue-1', 'staff-1')).status).toBe(204)
    expect(deleteById).toHaveBeenCalledTimes(2)
  })

  it('GET /duplicates only considers open issues of the same category', async () => {
    const res = await call('GET', '/issues/duplicates?category=pothole&x=35&y=26', 'resident-1')
    expect(res.status).toBe(200)
    const where =
      (
        findMany.mock.calls.find((c) => c[0] === 'issues')?.[1] as unknown as
          { where?: unknown[] } | undefined
      )?.where ?? []
    expect(where).toContainEqual({ field: 'category', operator: '=', value: 'pothole' })
    expect(where).toContainEqual({
      field: 'status',
      operator: 'not_in',
      value: ['resolved', 'dismissed'],
    })
    const list = (await res.json()) as Array<{ id: string; distance_blocks: number }>
    expect(list).toHaveLength(1)
    expect(list[0].distance_blocks).toBeCloseTo(1.4, 1)
  })
})
