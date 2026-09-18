import type { Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// POST /study/review updated the card's SM-2 fields but never advanced the user's study streak on
// user_profiles — so the "🔥 N day streak" (and the profile's total_reviews) stayed frozen at 0.
// A review must roll up current_streak/longest_streak/last_study_date by the calendar-day delta.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  updateMany: (...a: unknown[]) => db.updateMany(...a),
  create: (...a: unknown[]) => db.create(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/study.js'

function reviewHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/review' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /review not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const profileUpdate = () =>
  db.updateMany.mock.calls.find((c) => c[0] === 'user_profiles')?.[2] as
    Record<string, unknown> | undefined

async function review(profile: Record<string, unknown>): Promise<void> {
  db.findById.mockResolvedValue({
    id: 'c1',
    user_id: 'u1',
    deck_id: 'd1',
    ease_factor: 2.5,
    interval_days: 1,
    repetitions: 1,
    state: 'review',
    total_reviews: 5,
    lapses: 0,
  })
  db.findMany.mockResolvedValue([profile])
  await reviewHandler()({ body: { card_id: 'c1', quality: 5 } } as unknown as Request, makeRes())
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: {} })
  db.updateMany.mockResolvedValue({ data: {} })
  db.create.mockResolvedValue({ data: {} })
})
afterEach(() => vi.useRealTimers())

describe('study review rolls up the streak', () => {
  it('extends the streak when the last study was yesterday', async () => {
    await review({
      current_streak: 3,
      longest_streak: 10,
      last_study_date: '2026-05-19',
      total_reviews: 100,
    })
    expect(profileUpdate()).toMatchObject({
      current_streak: 4,
      longest_streak: 10,
      last_study_date: '2026-05-20',
      total_reviews: 101,
    })
  })

  it('keeps the streak (does not double-count) when already studied today', async () => {
    await review({
      current_streak: 4,
      longest_streak: 10,
      last_study_date: '2026-05-20',
      total_reviews: 50,
    })
    expect(profileUpdate()).toMatchObject({ current_streak: 4, total_reviews: 51 })
  })

  it('resets to 1 after a gap and never lowers longest_streak', async () => {
    await review({
      current_streak: 9,
      longest_streak: 9,
      last_study_date: '2026-05-01',
      total_reviews: 20,
    })
    expect(profileUpdate()).toMatchObject({ current_streak: 1, longest_streak: 9 })
  })
})
