import express, { type Express } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression guard for [L2-1] mark-read IDOR:
//   PATCH /notifications/:id must scope the write to the caller's own user_id
//   (atomic updateMany), never an unscoped updateById.

const CALLER = '11111111-1111-1111-1111-111111111111'
const NOTIF_ID = '33333333-3333-3333-3333-333333333333'

const state = vi.hoisted(() => ({ userId: null as string | null }))
const db = vi.hoisted(() => ({
  create: vi.fn(async () => ({ data: { id: NOTIF_ID }, affected: 1 })),
  deleteById: vi.fn(async () => ({ data: null, affected: 1 })),
  findById: vi.fn(async () => null as unknown),
  findMany: vi.fn(async () => [] as unknown[]),
  updateById: vi.fn(async () => ({ data: null, affected: 1 })),
  updateMany: vi.fn(async () => ({ data: null, affected: 1 })),
}))

vi.mock('@molecule/api-database', () => db)
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => state.userId,
  getParamId: (req: { params: { id: string } }) => req.params.id,
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

async function request(method: string, path: string, body?: unknown): Promise<{ status: number }> {
  const app = await buildApp()
  return new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      const r = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      await r.text()
      server.close()
      resolve({ status: r.status })
    })
  })
}

describe('warehouse-fulfillment notifications mark-read IDOR (L2-1)', () => {
  beforeEach(() => {
    state.userId = null
    db.findById.mockReset().mockResolvedValue(null)
    db.updateById.mockReset().mockResolvedValue({ data: null, affected: 1 })
    db.updateMany.mockReset().mockResolvedValue({ data: null, affected: 1 })
  })

  it('returns 401 unauthenticated and never touches the DB', async () => {
    const res = await request('PATCH', `/notifications/${NOTIF_ID}`, { read: true })
    expect(res.status).toBe(401)
    expect(db.updateMany).not.toHaveBeenCalled()
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it("does not mutate or leak another tenant's notification (404, no unscoped write)", async () => {
    state.userId = CALLER
    db.updateMany.mockResolvedValue({ data: null, affected: 0 })
    const res = await request('PATCH', `/notifications/${NOTIF_ID}`, { read: true })
    expect(res.status).toBe(404)
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
    const res = await request('PATCH', `/notifications/${NOTIF_ID}`, { read: true })
    expect(res.status).toBe(200)
    expect(db.updateById).not.toHaveBeenCalled()
    expect(scopedWhere()).toContainEqual({ field: 'user_id', operator: '=', value: CALLER })
  })
})
