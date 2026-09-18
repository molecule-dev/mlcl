import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// GET /api/refills/alerts computed days_remaining with a hardcoded dailyDose = 1, so a medication
// taken 3×/day reported ~3× too many days of supply and stayed out of the urgent / due-soon
// buckets. It now derives the per-day dose count from the medication's active schedules
// (times_of_day count × dose_quantity).

const db = {
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/refills.js'

function alertsHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/alerts' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /alerts not found')
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
  }) as unknown as Response & { body: unknown }
}

type Alert = {
  medication_id: string
  days_remaining: number
  daily_dose_count: number
  status: string
}
const run = (
  meds: Array<Record<string, unknown>>,
  schedules: Array<Record<string, unknown>>,
): Promise<Alert[]> => {
  db.findMany.mockImplementation((table: unknown) => {
    if (table === 'medications') return Promise.resolve(meds)
    if (table === 'medication_schedules') return Promise.resolve(schedules)
    return Promise.resolve([]) // refill_requests
  })
  const res = makeRes()
  return alertsHandler()({} as Request, res).then(() => res.body as Alert[])
}
const sched = (medication_id: string, times: string[], extra: Record<string, unknown> = {}) => ({
  medication_id,
  times_of_day: JSON.stringify(times),
  dose_quantity: 1,
  enabled: true,
  is_paused: false,
  ...extra,
})

beforeEach(() => vi.clearAllMocks())

describe('refill alerts derive days_remaining from the dose schedule', () => {
  it('a 3×/day medication burns supply 3× faster (supply 18 → 6 days, urgent)', async () => {
    const alerts = await run(
      [{ id: 'm1', name: 'Metformin', supply_remaining: 18 }],
      [sched('m1', ['08:00', '14:00', '20:00'])],
    )
    const a = alerts.find((x) => x.medication_id === 'm1')
    expect(a?.daily_dose_count).toBe(3)
    expect(a?.days_remaining).toBe(6)
    expect(a?.status).toBe('urgent')
  })

  it('applies dose_quantity (1×/day at 2 pills = 2/day; supply 10 → 5 days)', async () => {
    const alerts = await run(
      [{ id: 'm2', name: 'Iron', supply_remaining: 10 }],
      [sched('m2', ['09:00'], { dose_quantity: 2 })],
    )
    const a = alerts.find((x) => x.medication_id === 'm2')
    expect(a?.daily_dose_count).toBe(2)
    expect(a?.days_remaining).toBe(5)
  })

  it('falls back to 1/day when the medication has no active schedule', async () => {
    const alerts = await run([{ id: 'm3', name: 'Aspirin', supply_remaining: 20 }], [])
    const a = alerts.find((x) => x.medication_id === 'm3')
    expect(a?.daily_dose_count).toBe(1)
    expect(a?.days_remaining).toBe(20)
  })

  it('ignores a paused schedule (falls back to 1/day)', async () => {
    const alerts = await run(
      [{ id: 'm4', name: 'Vitamin D', supply_remaining: 12 }],
      [sched('m4', ['08:00', '20:00'], { is_paused: true })],
    )
    const a = alerts.find((x) => x.medication_id === 'm4')
    expect(a?.daily_dose_count).toBe(1)
    expect(a?.days_remaining).toBe(12)
  })
})

describe('refill alerts weight days_remaining by the schedule cadence', () => {
  it('a Mon/Wed/Fri weekly med lasts 7/3x longer than daily (21 pills → 49 days, fine)', async () => {
    const alerts = await run(
      [{ id: 'm5', name: 'Warfarin', supply_remaining: 21 }],
      [
        sched('m5', ['08:00'], {
          frequency_kind: 'weekly',
          days_of_week: JSON.stringify([1, 3, 5]),
        }),
      ],
    )
    const a = alerts.find((x) => x.medication_id === 'm5')
    // per-dosing-day count is still 1 (one time, 1 pill) — only the projection changes
    expect(a?.daily_dose_count).toBe(1)
    expect(a?.days_remaining).toBe(49) // 21 pills ÷ (3/7 per day) = 49
    expect(a?.status).toBe('fine')
  })

  it('an every-2-days cycle med lasts 2x longer (10 pills → 20 days)', async () => {
    const alerts = await run(
      [{ id: 'm6', name: 'Alendronate', supply_remaining: 10 }],
      [sched('m6', ['08:00'], { frequency_kind: 'cycle', interval_days: 2 })],
    )
    const a = alerts.find((x) => x.medication_id === 'm6')
    expect(a?.daily_dose_count).toBe(1)
    expect(a?.days_remaining).toBe(20) // 10 ÷ (0.5 per day)
  })

  it('an as-needed (PRN) med is excluded from projection (falls back to 1/day)', async () => {
    const alerts = await run(
      [{ id: 'm7', name: 'Ibuprofen', supply_remaining: 15 }],
      [sched('m7', ['08:00', '20:00'], { frequency_kind: 'as_needed' })],
    )
    const a = alerts.find((x) => x.medication_id === 'm7')
    expect(a?.daily_dose_count).toBe(1)
    expect(a?.days_remaining).toBe(15)
  })

  it('a plain daily schedule is unchanged (cadence factor 1)', async () => {
    const alerts = await run(
      [{ id: 'm8', name: 'Lisinopril', supply_remaining: 30 }],
      [sched('m8', ['08:00'], { frequency_kind: 'daily' })],
    )
    const a = alerts.find((x) => x.medication_id === 'm8')
    expect(a?.daily_dose_count).toBe(1)
    expect(a?.days_remaining).toBe(30)
  })
})
