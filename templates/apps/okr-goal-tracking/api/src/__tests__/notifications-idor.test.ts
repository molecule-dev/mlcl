import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for [L2-1]: notification mark-read must be owner-scoped.
// An authenticated user must NOT be able to flip (or read) another user's
// notification by supplying its id to POST /notifications/:id/read (IDOR /
// CWE-639). The handler scopes the lookup by user_id, so a non-owned id
// resolves to nothing and returns 404 without mutating anything.

// ---- Mock the molecule data layer the handler touches ----------------------
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'n-1', read_at: new Date() } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])
// findOne enforces ownership in the WHERE clause: it returns null when the
// id is not owned by the caller (exactly as the real scoped query does).
const findOne = vi.fn(
  async (..._a: unknown[]): Promise<{ id: string; user_id: string } | null> => ({
    id: 'n-1',
    user_id: 'owner-1',
  }),
)

vi.mock('@molecule/api-database', () => ({
  updateById: (...a: unknown[]) => updateById(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  findOne: (...a: unknown[]) => findOne(...a),
}))

// requireUser reads res.locals.session?.userId and writes 401 when absent.
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: (res: Response) => {
    const id = (res.locals.session as { userId?: string } | undefined)?.userId ?? null
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' })
      return null
    }
    return id
  },
  validationError: (res: Response, issues: unknown) => res.status(400).json({ error: issues }),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
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

describe('[L2-1] okr-goal-tracking notifications mark-read is owner-scoped (no IDOR)', () => {
  it('POST /:id/read scopes the lookup by the caller user_id', async () => {
    await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { 'x-test-user': 'owner-1' },
    })
    expect(findOne).toHaveBeenCalledTimes(1)
    const [, where] = findOne.mock.calls[0] as [string, Array<Record<string, unknown>>]
    expect(where).toContainEqual({ field: 'user_id', operator: '=', value: 'owner-1' })
  })

  it("POST /:id/read on another user's notification returns 404 and never mutates", async () => {
    // Ownership-scoped query yields nothing for a non-owned id.
    findOne.mockResolvedValueOnce(null)
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { 'x-test-user': 'attacker-2' },
    })
    expect(res.status).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('POST /:id/read on my own notification succeeds and marks it read', async () => {
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { 'x-test-user': 'owner-1' },
    })
    expect(res.status).toBe(200)
    expect(updateById).toHaveBeenCalledTimes(1)
    const [, id] = updateById.mock.calls[0] as [string, string]
    expect(id).toBe(notifId)
  })

  it('POST /:id/read with no session returns 401 and never mutates', async () => {
    const res = await fetch(`${baseUrl}/notifications/${notifId}/read`, { method: 'POST' })
    expect(res.status).toBe(401)
    expect(updateById).not.toHaveBeenCalled()
  })
})
