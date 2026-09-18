import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// maxSources is enforced on POST /streams but the sibling POST /sources (both write log_sources) never
// checked it, so a user could bypass the cap via /sources. POST /sources now runs the same in-handler
// count + tier check.

const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(async (..._a: unknown[]) => ({ data: { id: 's1' } })),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
const tier = { limits: { maxSources: 5 }, category: 'free' }
vi.mock('@molecule/api-entitlements', () => ({ getEffectiveTier: async () => tier }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: () => 'id1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

const { default: router } = await import('../handlers/sources.js')

function createHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response & { statusCode: number; body: unknown }
}
const run = async () => {
  const res = makeRes()
  await createHandler()({ body: { name: 'app.log', format: 'json' } } as unknown as Request, res)
  return res
}

describe('log-viewer enforces maxSources on POST /sources', () => {
  it('403s once the user is at the source cap', async () => {
    db.count.mockResolvedValueOnce(5)
    db.create.mockClear()
    const res = await run()
    expect(res.statusCode).toBe(403)
    expect((res.body as { limitType: string }).limitType).toBe('maxSources')
    expect(db.create).not.toHaveBeenCalled()
  })

  it('creates the source when under the cap', async () => {
    db.count.mockResolvedValueOnce(2)
    db.create.mockClear()
    const res = await run()
    expect(res.statusCode).not.toBe(403)
    expect(db.create).toHaveBeenCalledWith(
      'log_sources',
      expect.objectContaining({ user_id: 'u1' }),
    )
  })
})
