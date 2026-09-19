/**
 * Week-grid helpers for the meal plan and grocery list pages.
 *
 * A "week" is always identified by its Monday in ISO YYYY-MM-DD form — the
 * same convention the API's meal_plan_entries.week_start uses. Pure date
 * math + display formatting; no I/O.
 *
 * @module
 */

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const

export type MealSlot = (typeof MEAL_SLOTS)[number]

export const SLOT_META: Record<MealSlot, { icon: string; defaultLabel: string }> = {
  breakfast: { icon: 'wb_twilight', defaultLabel: 'Breakfast' },
  lunch: { icon: 'lunch_dining', defaultLabel: 'Lunch' },
  dinner: { icon: 'dinner_dining', defaultLabel: 'Dinner' },
}

/** 0 = Monday … 6 = Sunday — the `day` column's contract. */
export const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const DAY_SHORT_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** ISO YYYY-MM-DD for the Monday of the week containing `date`. */
export function weekStartOf(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dow = (d.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

/** Shift a Monday-ISO by n weeks (n may be negative). */
export function addWeeks(weekStart: string, n: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().slice(0, 10)
}

/** ISO YYYY-MM-DD of day index (0=Mon..6=Sun) within a week. */
export function dateOfDay(weekStart: string, day: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + day)
  return d.toISOString().slice(0, 10)
}

/** Whether weekStart is the week containing today. */
export function isCurrentWeek(weekStart: string): boolean {
  return weekStartOf() === weekStart
}

/** "Sep 14 – 20" style range label for a Monday-ISO. */
export function formatWeekRange(weekStart: string, locale = 'en-US'): string {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(`${weekStart}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 6)
  const startLabel = start.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const endLabel = end.toLocaleDateString(locale, {
    month: start.getUTCMonth() === end.getUTCMonth() ? undefined : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return `${startLabel} – ${endLabel}`
}

/** "Mon 14" short label for a day index within the week. */
export function formatDayLabel(weekStart: string, day: number, locale = 'en-US'): string {
  const iso = dateOfDay(weekStart, day)
  const d = new Date(`${iso}T00:00:00Z`)
  const weekday = d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
  return `${weekday} ${d.getUTCDate()}`
}

/** pg numeric columns arrive as strings; coerce to a finite number. */
export function num(v: number | string | null | undefined): number {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

/** "2" / "2.5" / "0.33" — no trailing zeros, no exponent. */
export function formatQuantity(v: number | string | null | undefined): string {
  const n = num(v)
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

/** "2 tbsp" / "3" — unit appended only when present. */
export function formatQuantityWithUnit(
  v: number | string | null | undefined,
  unit: string | null | undefined,
): string {
  const q = formatQuantity(v)
  return unit ? `${q} ${unit}` : q
}

/** Ordered aisle labels for grocery grouping (server category ids). */
export const GROCERY_CATEGORY_LABELS: ReadonlyArray<{ id: string; label: string; icon: string }> = [
  { id: 'produce', label: 'Produce', icon: 'eco' },
  { id: 'meat', label: 'Meat', icon: 'kebab_dining' },
  { id: 'seafood', label: 'Seafood', icon: 'set_meal' },
  { id: 'dairy', label: 'Dairy & Eggs', icon: 'egg' },
  { id: 'bakery', label: 'Bakery', icon: 'bakery_dining' },
  { id: 'frozen', label: 'Frozen', icon: 'ac_unit' },
  { id: 'pantry', label: 'Pantry', icon: 'inventory_2' },
  { id: 'spices', label: 'Spices', icon: 'science' },
  { id: 'drinks', label: 'Drinks', icon: 'local_cafe' },
  { id: 'other', label: 'Other', icon: 'shopping_basket' },
]

/** Human label for a grocery category id (unknown ids fall back to the id). */
export function categoryLabel(id: string): string {
  return GROCERY_CATEGORY_LABELS.find((c) => c.id === id)?.label ?? id
}
