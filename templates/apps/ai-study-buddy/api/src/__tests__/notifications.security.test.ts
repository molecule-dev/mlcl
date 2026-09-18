import express, { type Express } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression guard for [L2-1] IDOR in mark-read:
//   POST /notifications/:id/read previously called updateById('notifications',
//   id, { unread: false }) with NO ownership scoping and responded
//   res.json(result.data) — letting any authenticated caller mark-read AND
//   read (the row was leaked) ANY user's notification by id. The fix scopes
//   the write to id + user_id (mirroring the DELETE handler), 404s on a
//   no-op, and never returns another tenant's row.
//
// This test fails if the unscoped updateById sink is reintroduced.

const CALLER_ID = '11111111-1111-1111-1111-111111111111'

// Simulated store: the caller owns OWN_ID; FOREIGN_ID belongs to a victim.
const OWN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const FOREIGN_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

// updateMany only "affects" a row when the where-filter includes the caller's
// id AND the requested id matches an owned row — i.e. it models the DB scoping.
const updateManySpy = vi.fn(
  async (
    _table: string,
    where: Array<{ field: string; value: unknown }>,
    _data: Record<string, unknown>,
  ) => {
    const byId = where.find((w) => w.field === 'id')?.value
    const byUser = where.find((w) => w.field === 'user_id')?.value
    const affected = byUser === CALLER_ID && byId === OWN_ID ? 1 : 0
    return { affected }
  },
)

// If the buggy unscoped updateById is reintroduced, this would be the sink —
// the test asserts it is NEVER called.
const updateByIdSpy = vi.fn(async () => ({
  data: { id: FOREIGN_ID, user_id: 'victim', title: 'secret', body: 'leak' },
  affected: 1,
}))

vi.mock('@molecule/api-database', () => ({
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({ data: { id: 'mock' }, affected: 1 })),
  deleteMany: vi.fn(async () => ({ affected: 1 })),
  findMany: vi.fn(async () => []),
  updateById: updateByIdSpy,
  updateMany: updateManySpy,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => CALLER_ID,
  idParamSchema: { parse: (v: unknown) => v },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

async function buildApp(): Promise<Express> {
  const { default: notifications } = await import('../handlers/notifications.js')
  const app = express()
  app.use(express.json())
  app.use('/notifications', notifications)
  return app
}

function request(
  app: Express,
  method: string,
  path: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const addr = server.address()
        const port = typeof addr === 'object' && addr ? addr.port : 0
        const r = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: { 'content-type': 'application/json' },
          body: method === 'GET' ? undefined : JSON.stringify({}),
        })
        const body = await r.text()
        server.close()
        resolve({ status: r.status, body })
      } catch (error) {
        server.close()
        reject(error)
      }
    })
  })
}

describe('notifications mark-read IDOR (L2-1)', () => {
  beforeEach(() => {
    updateManySpy.mockClear()
    updateByIdSpy.mockClear()
  })

  it('blocks marking another user’s notification read and never leaks the row', async () => {
    const app = await buildApp()
    const res = await request(app, 'POST', `/notifications/${FOREIGN_ID}/read`)

    // No-op update (foreign id) -> 404, no body leak, and the unscoped
    // updateById sink is never used.
    expect(res.status).toBe(404)
    expect(res.body).not.toContain('victim')
    expect(res.body).not.toContain('secret')
    expect(updateByIdSpy).not.toHaveBeenCalled()

    // The write was attempted, but scoped by id + user_id.
    expect(updateManySpy).toHaveBeenCalledTimes(1)
    const where = updateManySpy.mock.calls[0][1]
    expect(where).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'id', value: FOREIGN_ID }),
        expect.objectContaining({ field: 'user_id', value: CALLER_ID }),
      ]),
    )
  })

  it('still marks the caller’s own notification read with a non-leaking 204', async () => {
    const app = await buildApp()
    const res = await request(app, 'POST', `/notifications/${OWN_ID}/read`)

    expect(res.status).toBe(204)
    expect(res.body).toBe('')
    expect(updateManySpy).toHaveBeenCalledTimes(1)
    expect(updateByIdSpy).not.toHaveBeenCalled()
  })
})
