/**
 * Streak recomputation helper, shared by entries.ts and habits.ts.
 *
 * Walks back from today over a habit's entries and updates
 * `current_streak`, `longest_streak`, and `total_completions`. Also issues
 * achievement-unlock rows + notifications when a new threshold is crossed.
 *
 * Date-comparison note: PostgreSQL `DATE` columns come back from the `pg`
 * driver as JS `Date` objects pinned to **local midnight** (e.g. a stored
 * `2026-05-02` arrives as `Date(2026, 4, 2, 0, 0, 0)` in the server's
 * timezone, which is `2026-05-01T21:00:00.000Z` for UTC+3). Calling
 * `toISOString()` then shifts the calendar date back by the offset and
 * makes a same-day check-in look like yesterday. We avoid the round-trip
 * by formatting both the entry dates and the "today" pivot via local
 * `getFullYear/getMonth/getDate`, which recovers the original calendar
 * date regardless of TZ offset.
 *
 * @module
 */

import { create, findMany, findOne, updateById } from '@molecule/api-database'

export interface HabitRow {
  id: string
  user_id: string
  longest_streak: number
  total_completions: number
  /**
   * The per-day goal count (e.g. drink water 3×/day). A day counts as completed only when its
   * entry `count` reaches this (default 1); a granted freeze is honored regardless. Consumed by
   * the streak walk and the completed-today / entry-completed flags.
   */
  target_count?: number
  /**
   * Which weekdays (0=Sun … 6=Sat) the habit is scheduled on. Stored as a
   * JSONB array (defaults to every day); the `pg` driver returns it parsed,
   * but we also tolerate a JSON string for safety. Consumed by the streak
   * walk so unscheduled days don't break the streak.
   */
  days_of_week?: number[] | string | null
  /**
   * Frequency: 'daily' (every day), 'custom' (specific `days_of_week`), or
   * 'weekly' (≥1 completion per calendar week, any day). Consumed by the streak
   * walk to pick day- vs week-based streak keeping — a 'weekly' habit defaults
   * `days_of_week` to all seven, so without this it would be walked as daily.
   */
  cadence?: string | null
}

export function formatLocalDate(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** The local YYYY-MM-DD of the Sunday that starts the week containing `d`. */
export function weekKey(d: string | Date): string {
  const base = typeof d === 'string' ? new Date(`${d.slice(0, 10)}T00:00:00`) : new Date(d)
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() - base.getDay())
  return formatLocalDate(base)
}

/**
 * Parse a habit's `days_of_week` into the set of scheduled weekdays (0–6).
 * Returns `null` when the habit runs every day (missing, empty, or all seven) —
 * the caller treats `null` as "every calendar day is scheduled", which keeps a
 * daily habit on the plain consecutive-day streak.
 */
export function parseScheduledDays(raw: number[] | string | null | undefined): Set<number> | null {
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch (_error) {
      // Malformed stored JSON is treated as "no schedule", the same as an absent value.
      return null
    }
  }
  if (!Array.isArray(value)) return null
  const days = value.filter((n): n is number => typeof n === 'number' && n >= 0 && n <= 6)
  if (days.length === 0 || days.length >= 7) return null
  return new Set(days)
}

export async function recomputeStreaks(habit: HabitRow, userId: string): Promise<void> {
  const entries = await findMany<{ date: string | Date; count: number; was_freeze?: boolean }>(
    'habit_entries',
    {
      where: [
        { field: 'habit_id', operator: '=', value: habit.id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'date', direction: 'desc' }],
      limit: 1000,
    },
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Dates (local YYYY-MM-DD) the habit was completed. A day is completed only when its entry
  // `count` reaches the habit's target (default 1), so a 3×/day habit isn't marked done after one
  // check-in. A granted streak-freeze files a synthetic count:1 entry flagged `was_freeze`, so we
  // treat any freeze day as completed regardless of target — freeze protection is preserved even
  // when the target exceeds 1.
  const targetCount = Math.max(1, Number(habit.target_count ?? 1))
  const completedDates = new Set<string>()
  for (const e of entries) {
    if (e.was_freeze || e.count >= targetCount) completedDates.add(formatLocalDate(e.date))
  }

  let currentStreak = 0
  if (String(habit.cadence ?? '') === 'weekly') {
    // A 'weekly' habit keeps its streak by ≥1 completion per calendar week (any
    // day), not per day — its `days_of_week` is all seven, so the day-walk below
    // would wrongly treat it as daily. Walk back week by week; the current week
    // is grace (not yet due), a past week with no completion breaks the streak.
    const completedWeeks = new Set<string>()
    for (const dateStr of completedDates) completedWeeks.add(weekKey(dateStr))
    const thisWeek = weekKey(today)
    const cursor = new Date(today)
    const MAX_WALK_WEEKS = 520
    for (let w = 0; w < MAX_WALK_WEEKS; w++) {
      const key = weekKey(cursor)
      if (completedWeeks.has(key)) {
        currentStreak++
      } else if (key !== thisWeek) {
        break
      }
      cursor.setDate(cursor.getDate() - 7)
    }
  } else {
    // Only days the habit is actually scheduled on count toward the streak. A
    // Mon/Wed/Fri habit must not have its streak broken by the days it was never
    // meant to run; a daily habit schedules all seven and this reduces to a
    // plain consecutive-day streak.
    const scheduledDays = parseScheduledDays(habit.days_of_week)
    const MAX_WALK_DAYS = 366 * 10
    const cursor = new Date(today)
    for (let i = 0; i < MAX_WALK_DAYS; i++) {
      const isScheduled = !scheduledDays || scheduledDays.has(cursor.getDay())
      if (isScheduled) {
        if (completedDates.has(formatLocalDate(cursor))) {
          currentStreak++
        } else {
          break
        }
      }
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  const totalCompletions = entries.reduce(
    (sum, e) => sum + (e.was_freeze || e.count >= targetCount ? 1 : 0),
    0,
  )
  await updateById('habits', habit.id, {
    current_streak: currentStreak,
    longest_streak: Math.max(currentStreak, habit.longest_streak ?? 0),
    total_completions: totalCompletions,
    updated_at: new Date(),
  })

  if (currentStreak > 0) {
    const eligible = await findMany<{ id: string; threshold_days: number; name: string }>(
      'achievements',
      {
        where: [{ field: 'threshold_days', operator: '<=', value: currentStreak }],
        orderBy: [{ field: 'threshold_days', direction: 'asc' }],
        limit: 50,
      },
    )
    for (const ach of eligible) {
      const already = await findOne('user_achievements', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'achievement_id', operator: '=', value: ach.id },
      ])
      if (already) continue
      await create('user_achievements', {
        user_id: userId,
        achievement_id: ach.id,
        unlocked_at: new Date(),
        progress_days: currentStreak,
        created_at: new Date(),
      })
      await create('notifications', {
        user_id: userId,
        type: 'achievement_unlocked',
        title: ach.name,
        body: `You unlocked "${ach.name}"!`,
        href: '/achievements',
        read: false,
        created_at: new Date(),
      })
    }
  }
}
