import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// changelog.is_public was written (default true, admin can set false) but the public GET / had no where
// clause and GET /:id ignored it — so a non-public entry leaked to every visitor. Both public reads now
// gate on is_public.

const db = {
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findById: vi.fn(async (..._a: unknown[]) => null as unknown),
  create: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: () => 'id1',
  getUserId: () => 'u1',
}))
vi.mock('@molecule/api-i18n', () => ({ t: (k: string) => k }))
vi.mock('@molecule/api-logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('../middleware/require-admin.js', () => ({
  requireAdmin: (_r: Request, _s: Response, n: () => void) => n(),
}))

const { default: router } = await import('../handlers/changelog.js')

function getHandler(path: string, method: string): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method} ${path} not found`)
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

describe('changelog public reads gate on is_public', () => {
  it('list filters is_public = true', async () => {
    db.findMany.mockClear()
    await getHandler('/', 'get')({ query: {} } as unknown as Request, makeRes())
    const call = db.findMany.mock.calls.find((c) => c[0] === 'changelog')
    expect((call?.[1] as { where: unknown }).where).toEqual([
      { field: 'is_public', operator: '=', value: true },
    ])
  })

  it('detail returns 404 for a non-public entry', async () => {
    db.findById.mockResolvedValueOnce({ id: 'id1', is_public: false })
    const res = makeRes()
    await getHandler('/:id', 'get')({ params: { id: 'id1' } } as unknown as Request, res)
    expect(res.statusCode).toBe(404)
  })

  it('detail returns a public entry', async () => {
    db.findById.mockResolvedValueOnce({ id: 'id1', is_public: true })
    const res = makeRes()
    await getHandler('/:id', 'get')({ params: { id: 'id1' } } as unknown as Request, res)
    expect(res.statusCode).toBe(200)
    expect((res.body as { id: string }).id).toBe('id1')
  })
})
