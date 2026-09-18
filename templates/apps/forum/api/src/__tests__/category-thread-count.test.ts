import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// forum_categories.thread_count was only ever initialised to 0 and never maintained, so every
// category rendered "0 threads". The read handlers now recompute it live from the threads
// table, overriding the stale stored value.

const db = {
  findById: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
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
}))

import router from '../handlers/categories.js'

function getByIdHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
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
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('category thread_count is recomputed live', () => {
  it('overrides the stale stored 0 with the actual thread count', async () => {
    db.findById.mockResolvedValue({ id: 'c1', name: 'Tech', thread_count: 0 })
    db.count.mockResolvedValue(5)
    const res = makeRes()
    await getByIdHandler()(
      { params: { id: 'c1' } } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(200)
    expect((res.body as { thread_count?: number }).thread_count).toBe(5)
    expect(db.count).toHaveBeenCalledWith('threads', [
      { field: 'category_id', operator: '=', value: 'c1' },
    ])
  })
})
