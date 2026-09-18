import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /alerts/check hard-filtered alert_rules to type='low_stock', so an enabled 'out_of_stock'
// rule (created from Settings, stored + enabled) produced zero alerts forever. The check now
// evaluates both stock-quantity rule types, emitting the right alert type/severity for each.
// (A 'variance' rule needs cycle-count/audit data this app doesn't model, so it's not evaluated.)

const db = { findMany: vi.fn(), create: vi.fn(), findById: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'user-1' }))
vi.mock('@molecule/api-emails', () => ({ hasTransport: () => false, sendMail: vi.fn() }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
  validateQuery: () => (_r: Request, _s: Response, n: () => void) => n(),
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
const alertsCreated = () =>
  db.create.mock.calls
    .filter((c) => c[0] === 'inventory_alerts')
    .map((c) => c[1] as Record<string, unknown>)
function setup(rules: unknown[], stockLevels: unknown[]) {
  db.findMany.mockImplementation((table: string) =>
    Promise.resolve(table === 'alert_rules' ? rules : table === 'stock_levels' ? stockLevels : []),
  )
  db.create.mockResolvedValue({ data: { id: 'alert-1' } })
}
const run = async () => {
  const res = makeRes()
  await checkHandler()({} as Request, res as unknown as Response)
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('alert check evaluates out_of_stock rules, not just low_stock', () => {
  it('queries both low_stock and out_of_stock rule types', async () => {
    setup([], [])
    await run()
    const call = db.findMany.mock.calls.find((c) => c[0] === 'alert_rules')
    const where = (
      call?.[1] as { where?: Array<{ field: string; operator: string; value: unknown }> }
    ).where
    expect(where).toContainEqual({
      field: 'type',
      operator: 'in',
      value: ['low_stock', 'out_of_stock'],
    })
  })

  it('emits an out_of_stock/critical alert when a stock row hits the out_of_stock threshold', async () => {
    setup(
      [{ id: 'r1', type: 'out_of_stock', threshold: 0, created_by: 'user-1' }],
      [{ product_id: 'p1', warehouse_id: 'w1', quantity: 0 }],
    )
    await run()
    const alerts = alertsCreated()
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ type: 'out_of_stock', severity: 'critical' })
  })

  it('still emits a low_stock/warning alert for a low_stock rule', async () => {
    setup(
      [{ id: 'r1', type: 'low_stock', threshold: 10, created_by: 'user-1' }],
      [{ product_id: 'p1', warehouse_id: 'w1', quantity: 5 }],
    )
    await run()
    const alerts = alertsCreated()
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ type: 'low_stock', severity: 'warning' })
  })

  it('does not alert when stock is above the out_of_stock threshold', async () => {
    setup(
      [{ id: 'r1', type: 'out_of_stock', threshold: 0, created_by: 'user-1' }],
      [{ product_id: 'p1', warehouse_id: 'w1', quantity: 5 }],
    )
    await run()
    expect(alertsCreated()).toHaveLength(0)
  })
})
