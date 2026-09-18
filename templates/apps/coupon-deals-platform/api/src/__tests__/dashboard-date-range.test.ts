import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The dashboard schema declared a from/to date range but the handler used `_req` and never read
// it — every range showed all-time stats. from/to must scope the redemptions (stats source) and
// notifications queries.

const db = { findMany: vi.fn(), findById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
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
const whereFor = (table: string) =>
  ((db.findMany.mock.calls.find((c) => c[0] === table)?.[1] as { where: Where } | undefined)
    ?.where ?? []) as Where

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([])
})

describe('dashboard date-range filter', () => {
  const FROM = '2026-01-01T00:00:00.000Z'
  const TO = '2026-02-01T00:00:00.000Z'

  it('scopes redemptions by purchased_at within from/to', async () => {
    await run({ from: FROM, to: TO })
    const w = whereFor('redemptions')
    expect(w.some((c) => c.field === 'purchased_at' && c.operator === '>=')).toBe(true)
    expect(w.some((c) => c.field === 'purchased_at' && c.operator === '<=')).toBe(true)
  })

  it('scopes notifications by created_at within from/to', async () => {
    await run({ from: FROM, to: TO })
    const w = whereFor('notifications')
    expect(w.some((c) => c.field === 'created_at' && c.operator === '>=')).toBe(true)
    expect(w.some((c) => c.field === 'created_at' && c.operator === '<=')).toBe(true)
  })

  it('applies no date bounds when from/to are absent', async () => {
    await run({})
    const w = whereFor('redemptions')
    expect(w.some((c) => c.field === 'purchased_at')).toBe(false)
    expect(w).toEqual([{ field: 'user_id', operator: '=', value: 'u1' }])
  })
})
