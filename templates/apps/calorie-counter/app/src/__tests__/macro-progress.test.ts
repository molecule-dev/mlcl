import { describe, expect, it } from 'vitest'

import { macroProgress } from '../lib/macros.js'

// The Today page built its macro bars from protein/carbs/fat only, dropping the stored (user-
// editable) fiber goal even though fiber intake is tracked. macroProgress() must include fiber.

describe('macroProgress', () => {
  it('includes fiber alongside protein/carbs/fat, in order', () => {
    const rows = macroProgress(
      { protein: 40, carbs: 100, fat: 30, fiber: 18 },
      { protein: 150, carbs: 250, fat: 65, fiber: 35 },
    )
    expect(rows.map((r) => r.key)).toEqual(['protein', 'carbs', 'fat', 'fiber'])
    const fiber = rows.find((r) => r.key === 'fiber')
    expect(fiber).toEqual({ key: 'fiber', current: 18, goal: 35 })
  })

  it('defaults the fiber goal to 30 when the goal is unset', () => {
    const fiber = macroProgress({ fiber: 10 }, { protein: 150, carbs: 250, fat: 65 }).find(
      (r) => r.key === 'fiber',
    )
    expect(fiber).toEqual({ key: 'fiber', current: 10, goal: 30 })
  })

  it('coerces string amounts (numeric columns arrive as strings) and treats missing as 0', () => {
    const rows = macroProgress({ protein: '40', fiber: '12' }, { protein: '150', fiber: '30' })
    expect(rows.find((r) => r.key === 'protein')).toEqual({
      key: 'protein',
      current: 40,
      goal: 150,
    })
    expect(rows.find((r) => r.key === 'fiber')).toEqual({ key: 'fiber', current: 12, goal: 30 })
    // carbs/fat absent from totals → current 0, goal falls back to defaults
    expect(rows.find((r) => r.key === 'carbs')).toEqual({ key: 'carbs', current: 0, goal: 250 })
  })

  it('uses all default goals when goal is null/undefined', () => {
    const rows = macroProgress(null, null)
    expect(rows.map((r) => `${r.key}:${r.current}/${r.goal}`)).toEqual([
      'protein:0/150',
      'carbs:0/250',
      'fat:0/65',
      'fiber:0/30',
    ])
  })
})
