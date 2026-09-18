import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for [L2-1]: notification mark-read must be owner-scoped.
// An authenticated user must NOT be able to flip (or read) another user's
// notification via POST /notifications/:id/read (IDOR / CWE-639). The handler
// verifies ownership (existing.user_id === caller) before mutating and returns
// 404 for a non-owned id without touching it. (Also confirms list / mutate
// routes are user-scoped — secrets-manager was flagged "auth NOOWN".)

const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'n-1', read_at: new Date() } }))
const updateMany = vi.fn(async (..._a: unknown[]) => ({ affected: 0 }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])
const findById = vi.fn(async (_table: string, id: string) => ({ id, user_id: 'owner-1' }))

vi.mock('@molecule/api-database', () => ({
  updateById: (...a: unknown[]) => updateById(...a),
  updateMany: (...a: unknown[]) => updateMany(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const notifications = (await import('../handlers/notifications.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  // The router declares full '/notifications/...' paths, so mount at root.
  app.use('/', notifications)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
})

const notifId = '11111111-1111-4111-8111-111111111111'

describe('[L2-1] secrets-manager notifications mark-read is owner-scoped (no IDOR)', () => {
  it("POST /notifications/:id/read on another user's notification returns 404 and never mutates", async () => {
    findById.mockResolvedValueOnce({ id: notifId, user_id: 'someone-else' })
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { 'x-test-user': 'attacker-2' },
    })
    expect(res.status).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('POST /notifications/:id/read on my own notification succeeds and marks it read', async () => {
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { 'x-test-user': 'owner-1' },
    })
    expect(res.status).toBe(204)
    expect(updateById).toHaveBeenCalledTimes(1)
    const [, id] = updateById.mock.calls[0] as [string, string]
    expect(id).toBe(notifId)
  })

  it('POST /notifications/:id/read with no session returns 401 and never mutates', async () => {
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, { method: 'POST' })
    expect(res.status).toBe(401)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('GET /notifications scopes the list query by the caller user_id', async () => {
    await fetch(`${baseUrl}/notifications`, { headers: { 'x-test-user': 'owner-1' } })
    expect(findMany).toHaveBeenCalledTimes(1)
    const [, opts] = findMany.mock.calls[0] as [string, { where: Array<Record<string, unknown>> }]
    expect(opts.where).toContainEqual({ field: 'user_id', operator: '=', value: 'owner-1' })
  })
})
