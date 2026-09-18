import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A set's is_warmup flag was stored but ignored by every aggregation: total_volume on completion
// summed all sets, and the 1RM personal-record recompute could crown a heavy warmup single as a
// PR. Warmup sets must be excluded from working-volume totals and from PR computation.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  updateById: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  deleteMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  uuidParamSchema: {},
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

import router from '../handlers/workouts.js'

function completeHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/complete' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/complete not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response

const workoutUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'workouts')?.[2] as
    Record<string, unknown> | undefined
const prCreate = () =>
  db.create.mock.calls.find((c) => c[0] === 'personal_records')?.[1] as
    { value: number } | undefined

const run = (sets: Array<Record<string, unknown>>) => {
  db.findById.mockResolvedValue({ id: 'w1', user_id: 'u1', started_at: new Date().toISOString() })
  db.findMany.mockImplementation((table: unknown) =>
    Promise.resolve(table === 'workout_sets' ? sets : []),
  )
  db.updateById.mockResolvedValue({ data: { id: 'w1' } })
  db.create.mockResolvedValue({ data: { id: 'pr1' } })
  return completeHandler()({ params: { id: 'w1' }, body: {} } as unknown as Request, makeRes())
}

beforeEach(() => vi.clearAllMocks())

describe('warmup sets are excluded from volume and PR math', () => {
  it('total_volume counts only working sets', async () => {
    await run([
      { exercise_id: 'e1', weight_kg: 100, reps: 5, is_warmup: false },
      { exercise_id: 'e1', weight_kg: 200, reps: 1, is_warmup: true },
    ])
    expect(workoutUpdate()?.total_volume).toBe(500) // 100×5; the 200×1 warmup is excluded
    expect(workoutUpdate()?.total_volume_kg).toBe(500)
  })

  it('a heavy warmup single does not register a 1RM personal record', async () => {
    await run([
      { exercise_id: 'e1', weight_kg: 50, reps: 5, is_warmup: false },
      { exercise_id: 'e1', weight_kg: 300, reps: 1, is_warmup: true },
    ])
    // PR comes from the 50×5 working set (Epley ≈ 58.3), never the 300 warmup (≈ 310).
    expect(prCreate()?.value).toBeCloseTo(50 * (1 + 5 / 30), 1)
    expect(prCreate()?.value).toBeLessThan(200)
  })

  it('a working set still sets its PR normally', async () => {
    await run([{ exercise_id: 'e1', weight_kg: 100, reps: 5, is_warmup: false }])
    expect(prCreate()?.value).toBeCloseTo(100 * (1 + 5 / 30), 1)
    expect(workoutUpdate()?.total_volume).toBe(500)
  })
})
