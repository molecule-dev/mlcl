import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// recomputeStreaks used to walk back over EVERY consecutive calendar day, so a habit that only runs
// some weekdays (a Mon/Wed/Fri or weekly habit — days_of_week is a subset) had its streak broken by
// the days it was never meant to run. It must skip unscheduled days: only days in days_of_week count.

const db = { findMany: vi.fn(), findOne: vi.fn(), updateById: vi.fn(), create: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
}))

import { parseScheduledDays, recomputeStreaks } from '../handlers/_streaks.js'

// Pin "today" so entry offsets are deterministic regardless of when the suite runs.
const TODAY = new Date(2026, 4, 15, 12, 0, 0)
const TODAY_WEEKDAY = TODAY.getDay()

/** Local YYYY-MM-DD for N days before the pinned today — mirrors _streaks' formatLocalDate. */
function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Run recomputeStreaks with the given entries + schedule, return the current_streak written. */
async function streakFor(
  entries: Array<{ date: string; count: number }>,
  days_of_week?: number[] | string | null,
): Promise<number> {
  db.findMany.mockImplementation((table: string) =>
    Promise.resolve(table === 'habit_entries' ? entries : []),
  )
  await recomputeStreaks(
    { id: 'h1', user_id: 'u1', longest_streak: 0, total_completions: 0, days_of_week },
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

describe('parseScheduledDays', () => {
  it('returns null for every-day schedules (missing / empty / all seven)', () => {
    expect(parseScheduledDays(undefined)).toBeNull()
    expect(parseScheduledDays([])).toBeNull()
    expect(parseScheduledDays([0, 1, 2, 3, 4, 5, 6])).toBeNull()
  })
  it('returns the weekday set for a subset, parsing a JSON string too', () => {
    expect(parseScheduledDays([1, 3, 5])).toEqual(new Set([1, 3, 5]))
    expect(parseScheduledDays('[1,3,5]')).toEqual(new Set([1, 3, 5]))
    expect(parseScheduledDays('garbage')).toBeNull()
  })
})

describe('recomputeStreaks honors the habit schedule', () => {
  it('daily habit: counts consecutive days', async () => {
    expect(await streakFor([0, 1, 2].map((n) => ({ date: daysAgo(n), count: 1 })))).toBe(3)
  })

  it('daily habit: a missed day breaks the streak', async () => {
    expect(await streakFor([0, 2].map((n) => ({ date: daysAgo(n), count: 1 })))).toBe(1)
  })

  it('weekly habit: unscheduled days between check-ins do NOT break the streak', async () => {
    // Scheduled only on today's weekday; check-ins 7 and 14 days back are the prior two occurrences.
    const streak = await streakFor(
      [0, 7, 14].map((n) => ({ date: daysAgo(n), count: 1 })),
      [TODAY_WEEKDAY],
    )
    expect(streak).toBe(3) // old consecutive-day walk would have returned 1
  })

  it('weekly habit: a completion on an unscheduled day is ignored (not counted, not breaking)', async () => {
    const streak = await streakFor(
      [
        { date: daysAgo(0), count: 1 },
        { date: daysAgo(3), count: 1 },
        { date: daysAgo(7), count: 1 },
      ],
      [TODAY_WEEKDAY],
    )
    expect(streak).toBe(2) // the offset-3 bonus day is unscheduled → skipped
  })

  it('weekly habit: a missed scheduled occurrence breaks the streak', async () => {
    const streak = await streakFor(
      [0, 14].map((n) => ({ date: daysAgo(n), count: 1 })), // the offset-7 occurrence is missing
      [TODAY_WEEKDAY],
    )
    expect(streak).toBe(1)
  })

  it("does not count today when today's scheduled check-in is missing", async () => {
    expect(await streakFor([1, 2].map((n) => ({ date: daysAgo(n), count: 1 })))).toBe(0)
  })
})
