import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A recording's max_views cap was stored and its view_count actively incremented, but the public
// GET /shared/:token read enforced only expires + password — never max_views — so a recording capped
// at N views served unlimited views. The read now rejects (410) once view_count >= max_views,
// mirroring the sibling share_links gate.

const db = { findMany: vi.fn(), create: vi.fn(), deleteById: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => ({ messageId: 'x' })) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../lib/authz.js', () => ({
  requireRecordingAccess: vi.fn(),
  requireRecordingOwner: vi.fn(),
}))

import router from '../handlers/recordings.js'

function sharedHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/shared/:token' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /shared/:token not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}
const run = (recording: Record<string, unknown>) => {
  db.findMany.mockResolvedValue([recording])
  const req = { params: { token: 'tok' }, query: {}, headers: {} } as unknown as Request
  const res = makeRes()
  return sharedHandler()(req, res).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('GET /shared/:token enforces the recording view cap', () => {
  it('410s once view_count has reached max_views', async () => {
    const res = await run({ id: 'r1', share_token: 'tok', max_views: 3, view_count: 3 })
    expect(res.statusCode).toBe(410)
  })

  it('serves the recording while under the cap', async () => {
    const res = await run({ id: 'r1', share_token: 'tok', max_views: 3, view_count: 2 })
    expect(res.statusCode).toBe(200)
    expect((res.body as { id?: string }).id).toBe('r1')
  })

  it('serves the recording when no cap is set', async () => {
    const res = await run({ id: 'r1', share_token: 'tok', max_views: null, view_count: 99 })
    expect(res.statusCode).toBe(200)
  })
})
