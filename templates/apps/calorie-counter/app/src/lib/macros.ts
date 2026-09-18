/**
 * Macro progress (current vs goal) for the Today page's macro bars.
 *
 * The fiber goal is stored server-side (nutrition_goals.fiber, user-editable) and fiber intake is
 * tracked, but the Today page built its macro list with only protein/carbs/fat — so the stored
 * fiber target silently did nothing. This helper includes fiber alongside the others, honoring each
 * stored goal (falling back to a sensible default when unset).
 */

export type MacroKey = 'protein' | 'carbs' | 'fat' | 'fiber'

const toNum = (v: number | string | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export interface MacroAmounts {
  protein?: number | string | null
  carbs?: number | string | null
  fat?: number | string | null
  fiber?: number | string | null
}

/** Per-user macro goal defaults, used only when no goal row / field is set. */
const DEFAULT_GOALS: Record<MacroKey, number> = { protein: 150, carbs: 250, fat: 65, fiber: 30 }

/** Ordered current-vs-goal figures for each tracked macro (protein, carbs, fat, fiber). */
export function macroProgress(
  totals: MacroAmounts | null | undefined,
  goal: MacroAmounts | null | undefined,
): Array<{ key: MacroKey; current: number; goal: number }> {
  const keys: MacroKey[] = ['protein', 'carbs', 'fat', 'fiber']
  return keys.map((key) => ({
    key,
    current: Math.round(toNum(totals?.[key])),
    goal: Math.max(1, Math.round(toNum(goal?.[key] ?? DEFAULT_GOALS[key]))),
  }))
}
