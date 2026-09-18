import express, { type Express } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression guard for [TPL-1] broken access control:
//   POST /api/notifications previously accepted a client-controlled `user_id`
//   (createNotificationSchema) and wrote a row into ANY user's inbox, also
//   trusting client-supplied actor_id/href/type — letting any authenticated
//   caller spam or impersonate. The standalone POST route has been removed:
//   notifications are emitted server-side only (posts.ts/follows.ts) where
//   user_id is resolved from the resource owner, never from the request body.
//
// This test fails if the writable POST route is reintroduced.

const createSpy = vi.fn(async () => ({ data: { id: 'mock' } }))

vi.mock('@molecule/api-database', () => ({
  create: createSpy,
  deleteById: vi.fn(),
  findById: vi.fn(async () => null),
  findMany: vi.fn(async () => []),
  updateById: vi.fn(),
  updateMany: vi.fn(async () => ({ data: [] })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Simulate an authenticated session: getUserId returns the caller's own id.
const CALLER_ID = '11111111-1111-1111-1111-111111111111'
const VICTIM_ID = '22222222-2222-2222-2222-222222222222'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => CALLER_ID,
  getParamId: (req: { params: { id: string } }) => req.params.id,
}))

vi.mock('../lib/enrich-posts.js', () => ({
  buildAuthor: (u: unknown) => u,
}))

async function buildApp(): Promise<Express> {
  const { default: notifications } = await import('../handlers/notifications.js')
  const app = express()
  app.use(express.json())
  app.use('/notifications', notifications)
  return app
}

describe('notifications security (TPL-1)', () => {
  beforeEach(() => {
    createSpy.mockClear()
  })

  it('does not expose a client-writable POST /notifications route', async () => {
    const app = await buildApp()

    const res = await new Promise<{ status: number }>((resolve) => {
      const server = app.listen(0, async () => {
        const addr = server.address()
        const port = typeof addr === 'object' && addr ? addr.port : 0
        const r = await fetch(`http://127.0.0.1:${port}/notifications`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            user_id: VICTIM_ID,
            type: 'system',
            body: 'pwned',
            href: 'https://evil.example',
          }),
        })
        server.close()
        resolve({ status: r.status })
      })
    })

    // Route removed → Express returns 404, and crucially no row is written.
    expect(res.status).toBe(404)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('still serves GET /notifications scoped to the caller', async () => {
    const app = await buildApp()
    const res = await new Promise<{ status: number }>((resolve) => {
      const server = app.listen(0, async () => {
        const addr = server.address()
        const port = typeof addr === 'object' && addr ? addr.port : 0
        const r = await fetch(`http://127.0.0.1:${port}/notifications`)
        server.close()
        resolve({ status: r.status })
      })
    })
    expect(res.status).toBe(200)
  })
})
