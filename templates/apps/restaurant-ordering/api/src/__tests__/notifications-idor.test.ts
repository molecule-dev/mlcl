import express, { type Express } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression guard for [L2-2] check-after-write IDOR:
//   PUT /notifications/:id/read previously called updateById FIRST (mutating
//   the row keyed only by id) and only THEN checked ownership — so another
//   tenant's notification was written before the 404 was returned. The write
//   must now be atomic + ownership-scoped (updateMany by id AND user_id); the
//   unscoped updateById must never run on this path.

const CALLER = '11111111-1111-1111-1111-111111111111'
const NOTIF_ID = '33333333-3333-3333-3333-333333333333'

const state = vi.hoisted(() => ({ userId: null as string | null }))
const db = vi.hoisted(() => ({
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({ data: { id: NOTIF_ID }, affected: 1 })),
  findById: vi.fn(async () => null as unknown),
  findMany: vi.fn(async () => [] as unknown[]),
  updateById: vi.fn(async () => ({ data: null, affected: 1 })),
  updateMany: vi.fn(async () => ({ data: null, affected: 1 })),
}))

vi.mock('@molecule/api-database', () => db)
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => state.userId,
}))

type Where = Array<{ field: string; operator: string; value: unknown }>

function scopedWhere(): Where | undefined {
  const calls = db.updateMany.mock.calls as unknown[][]
  const call = calls.find((c) => c[0] === 'notifications')
  return call ? (call[1] as Where) : undefined
}

async function buildApp(): Promise<Express> {
  const { default: notifications } = await import('../handlers/notifications.js')
  const app = express()
  app.use(express.json())
  app.use('/notifications', notifications)
  return app
}

async function request(method: string, path: string): Promise<{ status: number }> {
  const app = await buildApp()
  return new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      const r = await fetch(`http://127.0.0.1:${port}${path}`, { method })
      await r.text()
      server.close()
      resolve({ status: r.status })
    })
  })
}

describe('restaurant-ordering notifications mark-read IDOR (L2-2)', () => {
  beforeEach(() => {
    state.userId = null
    db.findById.mockReset().mockResolvedValue(null)
    db.updateById.mockReset().mockResolvedValue({ data: null, affected: 1 })
    db.updateMany.mockReset().mockResolvedValue({ data: null, affected: 1 })
  })

  it('returns 401 unauthenticated and never touches the DB', async () => {
    const res = await request('PUT', `/notifications/${NOTIF_ID}/read`)
    expect(res.status).toBe(401)
    expect(db.updateMany).not.toHaveBeenCalled()
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it("never writes another tenant's row before checking ownership (404, no unscoped write)", async () => {
    state.userId = CALLER
    db.updateMany.mockResolvedValue({ data: null, affected: 0 }) // scoped write matches nothing
    const res = await request('PUT', `/notifications/${NOTIF_ID}/read`)
    expect(res.status).toBe(404)
    // The check-after-write bug called updateById first — it must never run now.
    expect(db.updateById).not.toHaveBeenCalled()
    const where = scopedWhere()
    expect(where).toBeDefined()
    expect(where).toContainEqual({ field: 'user_id', operator: '=', value: CALLER })
    expect(where).toContainEqual({ field: 'id', operator: '=', value: NOTIF_ID })
  })

  it("marks the caller's own notification read (legit flow preserved)", async () => {
    state.userId = CALLER
    db.updateMany.mockResolvedValue({ data: null, affected: 1 })
    db.findById.mockResolvedValue({ id: NOTIF_ID, user_id: CALLER, read_at: 'now' })
    const res = await request('PUT', `/notifications/${NOTIF_ID}/read`)
    expect(res.status).toBe(200)
    expect(db.updateById).not.toHaveBeenCalled()
    expect(scopedWhere()).toContainEqual({ field: 'user_id', operator: '=', value: CALLER })
  })
})
