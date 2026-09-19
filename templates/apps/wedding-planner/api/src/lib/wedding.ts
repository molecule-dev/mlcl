/**
 * Pure wedding-planner domain logic — no database, no Express. The handlers
 * in ../handlers/ compose these; the contracts are pinned in
 * ../__tests__/wedding.test.ts.
 *
 * @module
 */

/** Collapse whitespace and casefold a typed guest name for matching. */
export function normalizeGuestName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

const CODE_ADJECTIVES = ['june', 'rose', 'harvest', 'meadow', 'gilded', 'velvet', 'cedar', 'linden']
const CODE_NOUNS = ['garden', 'orchard', 'ballroom', 'courtyard', 'vineyard', 'pavilion']

/**
 * A human-shareable RSVP code, e.g. `ROSE-GARDEN-417`. Unique per wedding;
 * regenerated only when the couple asks for a fresh one. `random` is
 * injectable so tests can pin the outcome.
 */
export function generateRsvpCode(random: () => number = Math.random): string {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)]
  const digits = String(Math.floor(100 + random() * 900))
  return `${pick(CODE_ADJECTIVES)}-${pick(CODE_NOUNS)}-${digits}`.toUpperCase()
}

export interface BudgetLine {
  category: string
  estimated_cents: number
  actual_cents: number | null
}

export interface BudgetRollup {
  estimated_total_cents: number
  actual_total_cents: number
  by_category: Array<{
    category: string
    estimated_cents: number
    actual_cents: number
    count: number
  }>
}

/**
 * Sum estimated vs actual spend overall and per category. Unset actuals
 * (null) contribute 0 to actual totals — "not spent yet", not "free".
 */
export function rollupBudget(items: BudgetLine[]): BudgetRollup {
  const byCategory = new Map<
    string,
    { category: string; estimated_cents: number; actual_cents: number; count: number }
  >()
  let estimatedTotal = 0
  let actualTotal = 0
  for (const item of items) {
    const estimated = Number(item.estimated_cents) || 0
    const actual = item.actual_cents == null ? 0 : Number(item.actual_cents) || 0
    estimatedTotal += estimated
    actualTotal += actual
    const bucket = byCategory.get(item.category) ?? {
      category: item.category,
      estimated_cents: 0,
      actual_cents: 0,
      count: 0,
    }
    bucket.estimated_cents += estimated
    bucket.actual_cents += actual
    bucket.count++
    byCategory.set(item.category, bucket)
  }
  return {
    estimated_total_cents: estimatedTotal,
    actual_total_cents: actualTotal,
    by_category: Array.from(byCategory.values()),
  }
}

/** Whole days from `now` until `dateIso` (ceiling, never negative). */
export function daysUntil(
  dateIso: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!dateIso) return null
  const ms = new Date(dateIso).getTime() - now.getTime()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export interface TaskLike {
  done: boolean
  due_date: string | null
}

/** Incomplete tasks whose due date has passed. */
export function countOverdue(tasks: TaskLike[], now: Date = new Date()): number {
  return tasks.filter(
    (task) => !task.done && task.due_date != null && new Date(task.due_date) < now,
  ).length
}

export const RSVP_STATUSES = ['pending', 'yes', 'no', 'maybe'] as const
export type RsvpStatus = (typeof RSVP_STATUSES)[number]

/** Tally guests by RSVP status, plus total confirmed plus-ones. */
export function tallyRsvps(guests: Array<{ rsvp_status: string; plus_ones?: number | null }>): {
  tally: Record<RsvpStatus, number>
  plus_ones_confirmed: number
} {
  const tally: Record<RsvpStatus, number> = { pending: 0, yes: 0, no: 0, maybe: 0 }
  let plusOnes = 0
  for (const guest of guests) {
    const status = guest.rsvp_status as RsvpStatus
    if ((RSVP_STATUSES as readonly string[]).includes(status)) tally[status]++
    if (guest.rsvp_status === 'yes') plusOnes += Number(guest.plus_ones) || 0
  }
  return { tally, plus_ones_confirmed: plusOnes }
}
