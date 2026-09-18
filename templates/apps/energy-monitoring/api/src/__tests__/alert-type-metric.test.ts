import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The alert evaluator compared the raw summed kWh for EVERY rule type. It must branch on rule.type:
// cost_threshold evaluates dollars (kWh x the user's rate), peak_demand evaluates the peak reading,
// and only the usage types evaluate summed kWh. Otherwise cost/peak rules mis-fire on the kWh sum.

const db = {
  findMany: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  findById: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({}) }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({
  maybeSeedDemoForUser: vi.fn().mockResolvedValue(undefined),
}))

import router from '../handlers/alerts.js'

function checkHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/check' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /check not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const alertCreated = () => db.create.mock.calls.find((c) => c[0] === 'energy_alerts')

/** Run /check for one rule against the given readings + rate. */
const run = (
  rule: Record<string, unknown>,
  readings: Array<{ value: number }>,
  ratePerKwh = 0.2,
) => {
  db.findMany.mockImplementation((table: string) =>
    Promise.resolve(
      table === 'meters'
        ? [{ id: 'm1' }]
        : table === 'alert_rules'
          ? [rule]
          : table === 'rate_plans'
            ? [{ rate_per_kwh: ratePerKwh }]
            : table === 'readings'
              ? readings
              : [],
    ),
  )
  return checkHandler()({ params: {} } as unknown as Request, makeRes())
}
const RULE = (type: string, threshold: number) => ({
  id: 'r1',
  type,
  threshold,
  comparison: 'above',
  meter_id: null,
  enabled: true,
  notify_email: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'a1' } })
})

describe('alert evaluator branches on rule.type', () => {
  it('cost_threshold compares dollars, not raw kWh (no false fire on the kWh sum)', async () => {
    // 100 kWh x $0.20 = $20 cost, below the $50 threshold → NO alert (old code compared 100 > 50).
    await run(RULE('cost_threshold', 50), [{ value: 100 }])
    expect(alertCreated()).toBeUndefined()
  })

  it('cost_threshold fires on the dollar cost and records that value', async () => {
    await run(RULE('cost_threshold', 15), [{ value: 100 }]) // $20 > $15
    expect((alertCreated()?.[1] as { value: number }).value).toBeCloseTo(20)
  })

  it('peak_demand compares the peak reading, not the sum', async () => {
    // peak 40 < 50 → NO alert (old code compared the sum 70 > 50).
    await run(RULE('peak_demand', 50), [{ value: 10 }, { value: 40 }, { value: 20 }])
    expect(alertCreated()).toBeUndefined()
  })

  it('high_usage still compares the summed kWh', async () => {
    await run(RULE('high_usage', 50), [{ value: 100 }])
    expect((alertCreated()?.[1] as { value: number }).value).toBe(100)
  })
})
