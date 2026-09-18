import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

// wiki_spaces.page_count was initialized to 0 and never maintained, so space cards always showed
// "0 pages". The space list + detail reads now derive the live non-trashed page count.

const db = {
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(async (..._a: unknown[]) => null as unknown),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(async (..._a: unknown[]) => null as unknown),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

const { default: router } = await import('../handlers/spaces.js')

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

describe('wiki space reads derive the live page_count', () => {
  it('the list replaces the stale page_count with a live non-trashed count per space', async () => {
    db.findMany.mockResolvedValueOnce([
      { id: 's1', name: 'A', page_count: 0 },
      { id: 's2', name: 'B', page_count: 0 },
    ])
    db.count.mockResolvedValue(3)
    const res = makeRes()
    await getHandler('/', 'get')({} as Request, res)
    const body = res.body as Array<{ id: string; page_count: number }>
    expect(body.map((s) => s.page_count)).toEqual([3, 3])
    // Counted non-trashed pages for the space.
    expect(db.count).toHaveBeenCalledWith('wiki_pages', [
      { field: 'space_id', operator: '=', value: 's1' },
      { field: 'trashed_at', operator: 'is_null', value: null },
    ])
  })

  it('the detail read derives page_count for an owned space', async () => {
    db.findById.mockResolvedValueOnce({ id: 's1', owner_id: 'u1', is_public: false })
    db.count.mockResolvedValueOnce(5)
    const res = makeRes()
    await getHandler('/:id', 'get')({ params: { id: 's1' } } as unknown as Request, res)
    expect((res.body as { page_count: number }).page_count).toBe(5)
  })
})
