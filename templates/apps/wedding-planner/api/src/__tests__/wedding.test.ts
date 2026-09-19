import { describe, expect, it } from 'vitest'

import {
  countOverdue,
  daysUntil,
  generateRsvpCode,
  normalizeGuestName,
  rollupBudget,
  tallyRsvps,
} from '../lib/wedding.js'

// The RSVP collection flow, budget gauge, and countdown are the product's
// signature features; their aggregation + matching rules are pure functions,
// so their contracts are pinned here.

describe('normalizeGuestName', () => {
  it('casefolds and collapses whitespace so lookup survives sloppy typing', () => {
    expect(normalizeGuestName('  alice   whitfield ')).toBe('alice whitfield')
    expect(normalizeGuestName('ALICE WHITFIELD')).toBe('alice whitfield')
  })

  it('round-trips the same shape the couple typed when adding the guest', () => {
    expect(normalizeGuestName('Devon Marsh')).toBe('devon marsh')
  })
})

describe('generateRsvpCode', () => {
  it('produces ADJECTIVE-NOUN-DIGITS, uppercase, with a 3-digit tail', () => {
    // Pin the rng: 0 → first adjective + first noun + 100.
    expect(generateRsvpCode(() => 0)).toBe('JUNE-GARDEN-100')
  })

  it('stays within the shareable length bound', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRsvpCode()
      expect(code).toMatch(/^[A-Z]+-[A-Z]+-\d{3}$/)
      expect(code.length).toBeLessThanOrEqual(24)
    }
  })
})

describe('rollupBudget', () => {
  const line = (over: Partial<Parameters<typeof rollupBudget>[0][number]>) => ({
    category: 'venue',
    estimated_cents: 100000,
    actual_cents: null as number | null,
    ...over,
  })

  it('treats null actuals as unspent, not free', () => {
    const roll = rollupBudget([line({ actual_cents: null })])
    expect(roll.estimated_total_cents).toBe(100000)
    expect(roll.actual_total_cents).toBe(0)
  })

  it('sums estimated and actual overall and per category', () => {
    const roll = rollupBudget([
      line({ estimated_cents: 90000, actual_cents: 95000 }),
      line({ category: 'catering', estimated_cents: 50000, actual_cents: 40000 }),
      line({ category: 'catering', estimated_cents: 10000 }),
    ])
    expect(roll.estimated_total_cents).toBe(150000)
    expect(roll.actual_total_cents).toBe(135000)
    const catering = roll.by_category.find((c) => c.category === 'catering')
    expect(catering).toMatchObject({ estimated_cents: 60000, actual_cents: 40000, count: 2 })
  })

  it('coerces string numeric columns (pg may hand back text) instead of NaN-ing', () => {
    const roll = rollupBudget([
      {
        category: 'venue',
        estimated_cents: '1200' as unknown as number,
        actual_cents: '800' as unknown as number,
      },
    ])
    expect(roll.estimated_total_cents).toBe(1200)
    expect(roll.actual_total_cents).toBe(800)
  })
})

describe('daysUntil', () => {
  it('counts whole days up, ceiling, never negative', () => {
    const now = new Date('2026-09-19T00:00:00Z')
    expect(daysUntil('2026-09-19T10:00:00Z', now)).toBe(1) // partial day ceilings
    expect(daysUntil('2026-09-20T00:00:00Z', now)).toBe(1)
    expect(daysUntil('2026-09-29T00:00:00Z', now)).toBe(10)
    expect(daysUntil('2026-09-01T00:00:00Z', now)).toBe(0) // past clamps to 0
  })

  it('returns null for missing or unparseable dates', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil('')).toBeNull()
    expect(daysUntil('not-a-date')).toBeNull()
  })
})

describe('countOverdue', () => {
  const now = new Date('2026-09-19T00:00:00Z')
  it('counts only incomplete tasks past their due date', () => {
    expect(
      countOverdue(
        [
          { done: false, due_date: '2026-09-01' },
          { done: false, due_date: '2026-10-01' },
          { done: true, due_date: '2026-09-01' },
          { done: false, due_date: null },
        ],
        now,
      ),
    ).toBe(1)
  })
})

describe('tallyRsvps', () => {
  it('tallies every status bucket and confirmed plus-ones', () => {
    const { tally, plus_ones_confirmed } = tallyRsvps([
      { rsvp_status: 'yes', plus_ones: 1 },
      { rsvp_status: 'yes', plus_ones: 0 },
      { rsvp_status: 'no', plus_ones: 2 }, // declined plus-ones don't count
      { rsvp_status: 'maybe' },
      { rsvp_status: 'pending' },
      { rsvp_status: 'pending' },
      { rsvp_status: 'weird-status' }, // unknown statuses only hit the total
    ])
    expect(tally).toEqual({ pending: 2, yes: 2, no: 1, maybe: 1 })
    expect(plus_ones_confirmed).toBe(1)
  })

  it('treats null plus_ones as zero', () => {
    const { plus_ones_confirmed } = tallyRsvps([{ rsvp_status: 'yes', plus_ones: null }])
    expect(plus_ones_confirmed).toBe(0)
  })
})
