import { describe, expect, it } from 'vitest'

import { boxIncludedItems } from '../lib/box-items.js'

// The Customize page saves item swaps to preferences.excludedItems, but the box-assembly path
// (ensurePendingBox) built box_items straight from plan.included_items — so a skipped item still
// shipped. boxIncludedItems is the pure resolution the assembler now uses.

const PLAN_ITEMS = ['Coffee', 'Mug', 'Notebook']

describe('boxIncludedItems', () => {
  it('removes excluded items (preferences stored as a JSON string)', () => {
    expect(boxIncludedItems(PLAN_ITEMS, JSON.stringify({ excludedItems: ['Mug'] }))).toEqual([
      'Coffee',
      'Notebook',
    ])
  })

  it('removes excluded items (preferences already an object)', () => {
    expect(boxIncludedItems(PLAN_ITEMS, { excludedItems: ['Coffee', 'Notebook'] })).toEqual(['Mug'])
  })

  it('ships all plan items when nothing is excluded', () => {
    expect(boxIncludedItems(PLAN_ITEMS, JSON.stringify({}))).toEqual(PLAN_ITEMS)
    expect(boxIncludedItems(PLAN_ITEMS, JSON.stringify({ excludedItems: [] }))).toEqual(PLAN_ITEMS)
  })

  it('treats missing / null / malformed preferences as no exclusions', () => {
    expect(boxIncludedItems(PLAN_ITEMS, undefined)).toEqual(PLAN_ITEMS)
    expect(boxIncludedItems(PLAN_ITEMS, null)).toEqual(PLAN_ITEMS)
    expect(boxIncludedItems(PLAN_ITEMS, '{not json')).toEqual(PLAN_ITEMS)
  })

  it('returns an empty list when the plan has no items', () => {
    expect(boxIncludedItems(undefined, JSON.stringify({ excludedItems: ['Mug'] }))).toEqual([])
  })
})
