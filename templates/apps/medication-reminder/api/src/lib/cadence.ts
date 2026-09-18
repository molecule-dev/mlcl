/**
 * Medication schedule cadence helpers.
 *
 * A schedule stores `frequency_kind` (daily / weekly / x_per_day / cycle /
 * as_needed) alongside `days_of_week` and `interval_days`. Supply projection
 * must account for how often the medication is actually taken: a pill taken
 * only Mon/Wed/Fri lasts 7/3× longer than a daily one. These pure helpers turn
 * a schedule's cadence into an average dosing-days-per-week factor.
 *
 * @module
 */

export type FrequencyKind = 'daily' | 'weekly' | 'x_per_day' | 'cycle' | 'as_needed'

/**
 * Parse a `days_of_week` value (the driver may hand it back as a JSON string
 * or an array) into an array of 0-6 weekday integers (0 = Sunday).
 */
export function parseDaysOfWeek(raw: unknown): number[] {
  let v: unknown = raw
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch (_error) {
      // Malformed stored JSON is treated as an empty list, the same as an absent value.
      return []
    }
  }
  if (!Array.isArray(v)) return []
  return v.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
}

/**
 * Average number of days per 7-day week on which a dose is taken, given the
 * schedule's cadence. Used to convert a per-dosing-day dose count into an
 * average daily consumption for supply projection:
 *
 *   - `daily` / `x_per_day` — every day (7). `x_per_day` varies the number of
 *     TIMES per day, not the number of days, so it still doses every day.
 *   - `weekly` — only on the listed `days_of_week` (its length, 1-7). A weekly
 *     schedule with no explicit days is degenerate and treated as daily.
 *   - `cycle` — every `interval_days` days (7 / interval_days).
 *   - `as_needed` — PRN; no fixed schedule, so 0 (callers skip the projection).
 */
export function dosingDaysPerWeek(
  frequencyKind: string,
  daysOfWeek: number[],
  intervalDays: number,
): number {
  switch (frequencyKind) {
    case 'weekly': {
      const n = daysOfWeek.length
      return n > 0 ? Math.min(7, n) : 7
    }
    case 'cycle': {
      const iv = Math.max(1, Math.floor(intervalDays))
      return 7 / iv
    }
    case 'as_needed':
      return 0
    case 'daily':
    case 'x_per_day':
    default:
      return 7
  }
}
