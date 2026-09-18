import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A 'weekly' cadence habit stores days_of_week = all seven, so the day-based streak walk treated it
// as daily and broke the streak the day after each check-in. recomputeStreaks now keeps a weekly
// habit's streak by >=1 completion per calendar week (any day), with the current week as grace.

const db = { findMany: vi.fn(), findOne: vi.fn(), updateById: vi.fn(), create: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
}))

import { recomputeStreaks } from '../handlers/_streaks.js'

// Pin "today" so week offsets are deterministic. Offsets are all multiples of 7,
// so the grouping into consecutive weeks holds regardless of today's weekday.
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
async function weeklyStreakFor(dayOffsets: number[]): Promise<number> {
  const entries = dayOffsets.map((n) => ({ date: daysAgo(n), count: 1 }))
  db.findMany.mockImplementation((table: string) =>
    Promise.resolve(table === 'habit_entries' ? entries : []),
  )
  await recomputeStreaks(
    {
      id: 'h1',
      user_id: 'u1',
      longest_streak: 0,
      total_completions: 0,
      cadence: 'weekly',
      days_of_week: [0, 1, 2, 3, 4, 5, 6], // what the app stores for a weekly habit
    },
    'u1',
  )
  const call = db.updateById.mock.calls.find((c) => c[0] === 'habits')
  return (call?.[2] as { current_streak: number }).current_streak
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

describe('recomputeStreaks weekly cadence', () => {
  it('counts consecutive weeks with a completion, not consecutive days', async () => {
    // This week + each of the prior two weeks. The old daily walk returned 1
    // (today done, yesterday not); weekly keeps all three.
    expect(await weeklyStreakFor([0, 7, 14])).toBe(3)
  })

  it('a single completed week is a 1-week streak', async () => {
    expect(await weeklyStreakFor([0])).toBe(1)
  })

  it('graces the current week (streak from prior weeks when this week is not done yet)', async () => {
    expect(await weeklyStreakFor([7, 14])).toBe(2)
  })

  it('resets to 1 when a full week was missed', async () => {
    // This week + two weeks ago, but last week missed.
    expect(await weeklyStreakFor([0, 14])).toBe(1)
  })
})
