/**
 * The "Near Me" feed must honor the user's saved search preferences
 * (Settings → search_radius_km + favorite_categories, stored in
 * user_settings.preferences). The nearby_deals listing previously ignored
 * both, so changing either had no effect on results. These tests cover the
 * pure preference helpers and the wired-up handler filter.
 */
import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import {
  effectiveRadiusKm,
  readNearbyPrefs,
  resolveFavoriteCategoryIds,
} from '../lib/nearby-filter.js'

describe('nearby-filter pure helpers', () => {
  it('readNearbyPrefs extracts radius + favorite categories, tolerating junk', () => {
    expect(
      readNearbyPrefs({ search_radius_km: 3, favorite_categories: ['Coffee', 'Food'] }),
    ).toEqual({ radiusKm: 3, favoriteCategories: ['Coffee', 'Food'] })
    // non-string entries dropped; missing/blown-up shapes → empty list
    expect(readNearbyPrefs({ favorite_categories: ['ok', 5, null] }).favoriteCategories).toEqual([
      'ok',
    ])
    expect(readNearbyPrefs(null).favoriteCategories).toEqual([])
    expect(readNearbyPrefs(undefined).radiusKm).toBeUndefined()
  })

  it('effectiveRadiusKm: query override wins, else saved, else null; non-positive = no cap', () => {
    expect(effectiveRadiusKm(2, 10)).toBe(2) // explicit override wins
    expect(effectiveRadiusKm(undefined, 10)).toBe(10) // saved
    expect(effectiveRadiusKm(undefined, '7')).toBe(7) // stringy saved coerced
    expect(effectiveRadiusKm(undefined, undefined)).toBeNull() // no cap
    expect(effectiveRadiusKm(undefined, 0)).toBeNull() // 0 = no cap, never blanks the feed
    expect(effectiveRadiusKm(0, 10)).toBe(10) // non-positive override ignored
  })

  it('resolveFavoriteCategoryIds matches names/slugs case-insensitively; unmatched → empty', () => {
    const cats = [
      { id: 'c1', name: 'Coffee', slug: 'coffee' },
      { id: 'c2', name: 'Restaurants', slug: 'restaurants' },
    ]
    expect(resolveFavoriteCategoryIds(['coffee'], cats)).toEqual(['c1'])
    expect(resolveFavoriteCategoryIds([' Restaurants '], cats)).toEqual(['c2']) // trimmed
    expect(resolveFavoriteCategoryIds(['Coffee', 'restaurants'], cats)).toEqual(['c1', 'c2'])
    expect(resolveFavoriteCategoryIds(['nope'], cats)).toEqual([]) // no match → no filter
    expect(resolveFavoriteCategoryIds([], cats)).toEqual([])
  })
})

// ---- Handler-level: real decorate, mocked data layer ------------------------

const USER_SETTINGS = {
  user_id: 'u1',
  preferences: { search_radius_km: 1, favorite_categories: ['Coffee'] },
}
const CATEGORIES = [
  { id: 'c-coffee', name: 'Coffee', slug: 'coffee', status: 'active' },
  { id: 'c-food', name: 'Restaurants', slug: 'restaurants', status: 'active' },
]
const NEARBY_ROWS = [
  { id: 'n1', deal_id: 'd1', merchant_id: 'm1', distance_km: 0.5 }, // coffee, near → keep
  { id: 'n2', deal_id: 'd2', merchant_id: 'm1', distance_km: 0.5 }, // food, near → drop (category)
  { id: 'n3', deal_id: 'd3', merchant_id: 'm1', distance_km: 3 }, // coffee, far → drop (radius)
]
const DEALS: Record<string, Record<string, unknown>> = {
  d1: {
    id: 'd1',
    category_id: 'c-coffee',
    title: 'Latte',
    discount_percent: 20,
    discounted_price: 500,
  },
  d2: {
    id: 'd2',
    category_id: 'c-food',
    title: 'Burger',
    discount_percent: 10,
    discounted_price: 900,
  },
  d3: {
    id: 'd3',
    category_id: 'c-coffee',
    title: 'Cold Brew',
    discount_percent: 15,
    discounted_price: 400,
  },
}

const findOne = vi.fn(async (_table: string, _where: unknown) => USER_SETTINGS)
const findMany = vi.fn(async (table: string, _opts?: unknown) => {
  if (table === 'categories') return CATEGORIES
  if (table === 'nearby_deals') return NEARBY_ROWS
  return []
})
const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'deals') return DEALS[id] ?? null
  if (table === 'merchants') return { id, business_name: 'Cafe' }
  return null
})

vi.mock('@molecule/api-database', () => ({
  findOne: (...a: unknown[]) => findOne(a[0] as string, a[1]),
  findMany: (...a: unknown[]) => findMany(a[0] as string, a[1]),
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

const { default: router } = await import('../handlers/nearby_deals.js')

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] }
}
function getHandler(): (req: Request, res: Response) => Promise<unknown> {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack
  for (const layer of stack) {
    const r = layer.route
    if (r && r.path === '/' && r.methods.get) {
      return r.stack[r.stack.length - 1].handle as (req: Request, res: Response) => Promise<unknown>
    }
  }
  throw new Error('GET / handler not found')
}
function mockRes() {
  const res = { locals: { session: { userId: 'u1' } }, statusCode: 200, body: undefined as unknown }
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

describe('GET /nearby_deals applies saved radius + favorite categories', () => {
  it('drops out-of-category and out-of-radius deals', async () => {
    const res = mockRes()
    await getHandler()({ query: {}, params: {} } as unknown as Request, res)
    const body = res.body as { id: string }[]
    expect(body.map((d) => d.id)).toEqual(['d1']) // d2 wrong category, d3 too far
  })
})
