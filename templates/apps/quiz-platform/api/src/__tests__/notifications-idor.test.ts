import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for [L2-1]: notification mark-read must be owner-scoped.
// An authenticated user must NOT be able to flip (or read) another user's
// notification via PUT /notifications/:id/read (IDOR / CWE-639). The handler
// verifies ownership (item.user_id === caller) before mutating and returns
// 404 for a non-owned id without touching it.

const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'n-1', read: true } }))
const query = vi.fn(async (..._a: unknown[]) => ({ rows: [] as unknown[] }))
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])
const findById = vi.fn(async (_table: string, id: string) => ({ id, user_id: 'owner-1' }))

vi.mock('@molecule/api-database', () => ({
  updateById: (...a: unknown[]) => updateById(...a),
  query: (...a: unknown[]) => query(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// _seed is only used by GET; mock it so importing the handler stays DB-free.
vi.mock('../handlers/_seed.js', () => ({ seedDemoOnSignup: vi.fn(async () => undefined) }))

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
  app.use('/notifications', notifications)

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

describe('[L2-1] quiz-platform notifications mark-read is owner-scoped (no IDOR)', () => {
  it("PUT /:id/read on another user's notification returns 404 and never mutates", async () => {
    findById.mockResolvedValueOnce({ id: notifId, user_id: 'someone-else' })
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: 'PUT',
      headers: { 'x-test-user': 'attacker-2' },
    })
    expect(res.status).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('PUT /:id/read on my own notification succeeds and marks it read', async () => {
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: 'PUT',
      headers: { 'x-test-user': 'owner-1' },
    })
    expect(res.status).toBe(200)
    expect(updateById).toHaveBeenCalledTimes(1)
    const [, id] = updateById.mock.calls[0] as [string, string]
    expect(id).toBe(notifId)
  })

  it('PUT /:id/read with no session returns 401 and never mutates', async () => {
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, { method: 'PUT' })
    expect(res.status).toBe(401)
    expect(updateById).not.toHaveBeenCalled()
  })
})
