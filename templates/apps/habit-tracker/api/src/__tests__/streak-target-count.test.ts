import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A day counts toward completion/streak only when its entry `count` reaches the habit's
// target_count (a per-day goal, default 1) — a 3×/day habit was previously marked "done" after a
// single check-in (count > 0). Freeze days (was_freeze) still count regardless of target.

const db = { findMany: vi.fn(), findOne: vi.fn(), updateById: vi.fn(), create: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
}))

import { recomputeStreaks } from '../handlers/_streaks.js'

const TODAY = new Date(2026, 4, 15, 12, 0, 0)

function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Entry = { date: string; count: number; was_freeze?: boolean }
async function statsFor(
  entries: Entry[],
  target_count?: number,
): Promise<{ current_streak: number; total_completions: number }> {
  db.findMany.mockImplementation((table: string) =>
    Promise.resolve(table === 'habit_entries' ? entries : []),
  )
  await recomputeStreaks(
    { id: 'h1', user_id: 'u1', longest_streak: 0, total_completions: 0, target_count },
    'u1',
  )
  const call = db.updateById.mock.calls.find((c) => c[0] === 'habits')
  return call?.[2] as { current_streak: number; total_completions: number }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
  vi.clearAllMocks()
  db.findOne.mockResolvedValue(null)
  db.updateById.mockResolvedValue({})
  db.create.mockResolvedValue({})
})
afterEach(() => vi.useRealTimers())

describe('recomputeStreaks honors target_count', () => {
  it('a check-in below target does not complete the day', async () => {
    expect((await statsFor([{ date: daysAgo(0), count: 1 }], 3)).current_streak).toBe(0)
  })

  it('consecutive days that each meet the target build the streak', async () => {
    const r = await statsFor(
      [
        { date: daysAgo(0), count: 3 },
        { date: daysAgo(1), count: 4 },
      ],
      3,
    )
    expect(r.current_streak).toBe(2)
  })

  it('a partial day breaks the streak', async () => {
    const r = await statsFor(
      [
        { date: daysAgo(0), count: 3 },
        { date: daysAgo(1), count: 2 },
      ],
      3,
    )
    expect(r.current_streak).toBe(1) // today met (3>=3); yesterday 2<3 → break
  })

  it('a freeze day counts even below target', async () => {
    const r = await statsFor(
      [
        { date: daysAgo(0), count: 3 },
        { date: daysAgo(1), count: 1, was_freeze: true },
      ],
      3,
    )
    expect(r.current_streak).toBe(2)
  })

  it('total_completions counts only days that met the target (or froze)', async () => {
    const r = await statsFor(
      [
        { date: daysAgo(0), count: 3 },
        { date: daysAgo(1), count: 1 },
        { date: daysAgo(2), count: 3 },
      ],
      3,
    )
    expect(r.total_completions).toBe(2)
  })

  it('an unset target_count behaves as 1 (any positive count completes)', async () => {
    const r = await statsFor(
      [
        { date: daysAgo(0), count: 1 },
        { date: daysAgo(1), count: 1 },
      ],
      undefined,
    )
    expect(r.current_streak).toBe(2)
  })
})
