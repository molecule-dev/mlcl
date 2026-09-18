import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Reports order reviews by completed_at and compute time-to-complete from it, but the PUT
// handler just spread req.body — so marking a review 'completed' left completed_at null unless
// the client passed it. The handler now derives completed_at (and started_at) server-side on
// the status transition, mirroring the create path.

const db = {
  updateById: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  updateById: (...a: unknown[]) => db.updateById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
const requireOwnership = vi.fn()
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireOwnership: (...a: unknown[]) => requireOwnership(...a),
  requireUser: () => 'user-1',
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-resource-user', () => ({
  authorizers: { auth: () => (_req: Request, _res: Response, next: () => void) => next() },
}))

import router from '../handlers/reviews.js'

function putHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.put)
  if (!layer?.route) throw new Error('PUT /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    locals: { session: { userId: 'user-1' } },
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
  }
  return res
}
const run = (body: Record<string, unknown>, res: ReturnType<typeof makeRes>) =>
  putHandler()({ params: { id: 'r1' }, body } as unknown as Request, res as unknown as Response)
const patch = () => db.updateById.mock.calls[0]?.[2] as Record<string, unknown> | undefined

beforeEach(() => {
  vi.clearAllMocks()
  requireOwnership.mockResolvedValue({ ok: true, row: { id: 'r1' } })
  db.updateById.mockResolvedValue({ data: { id: 'r1' } })
})

describe('review PUT derives lifecycle timestamps on status transition', () => {
  it('sets completed_at when marked completed', async () => {
    await run({ status: 'completed' }, makeRes())
    expect(typeof patch()?.completed_at).toBe('string')
  })

  it('keeps a client-supplied completed_at', async () => {
    await run({ status: 'completed', completed_at: '2020-01-01T00:00:00.000Z' }, makeRes())
    expect(patch()?.completed_at).toBe('2020-01-01T00:00:00.000Z')
  })

  it('sets started_at when marked running', async () => {
    await run({ status: 'running' }, makeRes())
    expect(typeof patch()?.started_at).toBe('string')
    expect(patch()?.completed_at).toBeUndefined()
  })
})
