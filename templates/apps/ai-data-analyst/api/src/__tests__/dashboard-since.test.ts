import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The dashboard schema declared `since` but the handler used `_req` and never read it — every
// window rendered all-time KPIs. `since` must scope every dashboard query (rows AND totals) by
// created_at.

const db = { findMany: vi.fn(), count: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn(async () => undefined) }))

import router from '../handlers/reports.js'

type Where = Array<{ field: string; operator: string; value: unknown }>
function handler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/dashboard_stats' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /dashboard_stats not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const run = (query: Record<string, unknown>) =>
  handler()({ query } as unknown as Request, makeRes())
// every findMany + count in this handler shares one where array
const firstWhere = () =>
  ((db.findMany.mock.calls[0]?.[1] as { where: Where } | undefined)?.where ?? []) as Where

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([])
  db.count.mockResolvedValue(0)
})

describe('dashboard `since` window', () => {
  it('bounds every query by created_at >= since', async () => {
    await run({ since: '2026-01-01T00:00:00.000Z' })
    expect(firstWhere().some((c) => c.field === 'created_at' && c.operator === '>=')).toBe(true)
    // count() shares the same bounded where
    const countWhere = (db.count.mock.calls[0]?.[1] as Where) ?? []
    expect(countWhere.some((c) => c.field === 'created_at' && c.operator === '>=')).toBe(true)
  })

  it('applies no created_at bound when since is absent', async () => {
    await run({})
    expect(firstWhere()).toEqual([{ field: 'user_id', operator: '=', value: 'u1' }])
  })
})
