import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The property list handler had two branches: a plain-list branch that applied every structured
// filter + sort, and a text-search branch (when ?q=... is set) that passed ONLY the text — silently
// dropping type/price/beds/baths/sqft/status/sort. The search path now composes the same filters +
// sort via the DB (restricted to the search-matched ids).

const db = {
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  count: vi.fn(async (..._a: unknown[]) => 0),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
}
const search = vi.fn(async (..._a: unknown[]) => ({
  hits: [{ document: { id: 'p1' } }, { document: { id: 'p2' } }],
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
  deleteDocument: vi.fn(),
}))
vi.mock('@molecule/api-geolocation', () => ({ geocode: vi.fn() }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateQuery: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

const { default: router, buildPropertyFilters } = await import('../handlers/properties.js')

describe('buildPropertyFilters', () => {
  it('emits the range + equality filters', () => {
    const where = buildPropertyFilters(
      { type: 'condo', min_price: 100, max_price: 900, bedrooms: 2, min_sqft: 500 },
      undefined,
    )
    expect(where).toContainEqual({ field: 'property_type', operator: '=', value: 'condo' })
    expect(where).toContainEqual({ field: 'price', operator: '>=', value: 100 })
    expect(where).toContainEqual({ field: 'price', operator: '<=', value: 900 })
    expect(where).toContainEqual({ field: 'bedrooms', operator: '>=', value: 2 })
    expect(where).toContainEqual({ field: 'square_feet', operator: '>=', value: 500 })
  })

  it('defaults status to active for public browse, scopes to owner when set', () => {
    expect(buildPropertyFilters({}, undefined)).toContainEqual({
      field: 'status',
      operator: '=',
      value: 'active',
    })
    const owned = buildPropertyFilters({}, 'owner-1')
    expect(owned).toContainEqual({ field: 'owner_id', operator: '=', value: 'owner-1' })
    // owner scope => no forced active-only status
    expect(owned.some((w) => w.field === 'status')).toBe(false)
  })
})

function listHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({ locals: {}, status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response
const whereOf = () =>
  (db.findMany.mock.calls[0]?.[1] as { where?: unknown[] } | undefined)?.where ?? []

beforeEach(() => vi.clearAllMocks())

describe('GET /properties composes text search with the structured filters', () => {
  it('applies the filters + restricts to search ids when ?q= is present', async () => {
    await listHandler()(
      {
        query: {
          q: 'home',
          type: 'condo',
          min_price: 500,
          sort_by: 'price',
          sort_order: 'asc',
          page: 1,
          limit: 20,
        },
      } as unknown as Request,
      makeRes(),
    )
    expect(search).toHaveBeenCalledTimes(1)
    const where = whereOf()
    expect(where).toContainEqual({ field: 'id', operator: 'in', value: ['p1', 'p2'] })
    expect(where).toContainEqual({ field: 'property_type', operator: '=', value: 'condo' })
    expect(where).toContainEqual({ field: 'price', operator: '>=', value: 500 })
  })

  it('still applies filters on the plain-list branch (no ?q=)', async () => {
    await listHandler()(
      {
        query: {
          type: 'house',
          min_price: 1000,
          sort_by: 'price',
          sort_order: 'desc',
          page: 1,
          limit: 20,
        },
      } as unknown as Request,
      makeRes(),
    )
    expect(search).not.toHaveBeenCalled()
    const where = whereOf()
    expect(where).toContainEqual({ field: 'property_type', operator: '=', value: 'house' })
    expect(where).toContainEqual({ field: 'price', operator: '>=', value: 1000 })
    expect(where.some((w) => (w as { field: string }).field === 'id')).toBe(false)
  })
})
