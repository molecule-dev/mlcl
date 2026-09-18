import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Both public-board endpoints must apply the SAME structured filters: a
// published-only gate plus the optional type/location/category/salary filters.
// The text-search path (/search) previously passed ONLY the query text to the
// index — silently dropping every filter AND surfacing draft/closed jobs (the
// index holds all statuses). It now text-matches first, then applies the shared
// filters via the DB, restricted to the matched ids.

const db = {
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
}
const search = vi.fn(async (..._a: unknown[]) => ({
  hits: [{ document: { id: 'j1' } }, { document: { id: 'j2' } }],
  total: 2,
}))
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-search', () => ({
  search: (...a: unknown[]) => search(...a),
  index: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: { id?: string } }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateQuery: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

const {
  default: router,
  buildPublicJobFilters,
  applySalaryFilter,
} = await import('../handlers/jobs.js')

describe('buildPublicJobFilters', () => {
  it('always gates to published, adds the equality filters when set', () => {
    const where = buildPublicJobFilters({ type: 'contract', location: 'Remote', category_id: 'c1' })
    expect(where).toContainEqual({ field: 'status', operator: '=', value: 'published' })
    expect(where).toContainEqual({ field: 'type', operator: '=', value: 'contract' })
    expect(where).toContainEqual({ field: 'location', operator: '=', value: 'Remote' })
    expect(where).toContainEqual({ field: 'category_id', operator: '=', value: 'c1' })
  })

  it('published-only when no filters supplied', () => {
    expect(buildPublicJobFilters({})).toEqual([
      { field: 'status', operator: '=', value: 'published' },
    ])
  })
})

describe('applySalaryFilter', () => {
  it('keeps jobs whose range overlaps the requested [min,max]', () => {
    const jobs = [
      { id: 'a', salary_min: 50, salary_max: 80 },
      { id: 'b', salary_min: 120, salary_max: 160 },
      { id: 'c', salary_min: 90, salary_max: 110 },
    ]
    // min=100 => drop 'a' (max 80 < 100); max=115 => drop 'b' (min 120 > 115)
    const kept = applySalaryFilter(jobs, 100, 115).map((j) => j.id)
    expect(kept).toEqual(['c'])
  })
})

function getHandler(path: string): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods.get)
  if (!layer?.route) throw new Error(`GET ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({ locals: {}, status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response
const whereOf = () =>
  (db.findMany.mock.calls[0]?.[1] as { where?: unknown[] } | undefined)?.where ?? []

beforeEach(() => vi.clearAllMocks())

describe('GET /search composes the text query with the structured filters', () => {
  it('text-matches, then applies published + type/location + id restriction', async () => {
    await getHandler('/search')(
      {
        query: { q: 'engineer', type: 'contract', location: 'Remote', page: 1, limit: 50 },
      } as unknown as Request,
      makeRes(),
    )
    expect(search).toHaveBeenCalledTimes(1)
    const where = whereOf()
    expect(where).toContainEqual({ field: 'id', operator: 'in', value: ['j1', 'j2'] })
    expect(where).toContainEqual({ field: 'status', operator: '=', value: 'published' })
    expect(where).toContainEqual({ field: 'type', operator: '=', value: 'contract' })
    expect(where).toContainEqual({ field: 'location', operator: '=', value: 'Remote' })
  })

  it('returns [] without hitting the DB when the text matches nothing', async () => {
    search.mockResolvedValueOnce({ hits: [], total: 0 })
    const res = makeRes()
    await getHandler('/search')(
      { query: { q: 'nomatch', page: 1, limit: 50 } } as unknown as Request,
      res,
    )
    expect(db.findMany).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith([])
  })
})

describe('GET /published applies the same filters, without a text query', () => {
  it('gates to published + type, never restricts by id', async () => {
    await getHandler('/published')(
      { query: { type: 'full_time', page: 1, limit: 50 } } as unknown as Request,
      makeRes(),
    )
    expect(search).not.toHaveBeenCalled()
    const where = whereOf()
    expect(where).toContainEqual({ field: 'status', operator: '=', value: 'published' })
    expect(where).toContainEqual({ field: 'type', operator: '=', value: 'full_time' })
    expect(where.some((w) => (w as { field: string }).field === 'id')).toBe(false)
  })
})
