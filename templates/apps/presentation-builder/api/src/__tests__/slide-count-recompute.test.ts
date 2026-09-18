import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// presentations.slide_count was only ever initialised to 0 and never maintained — so every
// presentation reported 0 slides, breaking the analytics totals and the "editing vs ready"
// status the app derives (slide_count === 0 ? 'editing' : 'ready'). The read handlers now
// recompute it live from the slides table.

const db = {
  findById: vi.fn(),
  findOne: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'owner-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
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

import router from '../handlers/presentations.js'

function getHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/presentations/:id' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /presentations/:id not found')
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

describe('presentation slide_count recompute', () => {
  it('overrides the stored 0 with the live slide count', async () => {
    db.findById.mockResolvedValue({ id: 'p1', owner_id: 'owner-1', slide_count: 0 })
    db.count.mockResolvedValue(7)
    const res = makeRes()
    await getHandler()({ params: { id: 'p1' } } as unknown as Request, res as unknown as Response)
    expect(res.statusCode).toBe(200)
    expect((res.body as { slide_count?: number }).slide_count).toBe(7)
    expect(db.count).toHaveBeenCalledWith('slides', [
      { field: 'presentation_id', operator: '=', value: 'p1' },
    ])
  })
})
