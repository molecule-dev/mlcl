import { describe, expect, it } from 'vitest'

import { MAX_PASSENGERS, parsePassengerCount } from '../lib/passengers.js'

// The traveler count chosen in search must survive into checkout — it drives both the price
// multiplier and the persisted passenger_count. Booking once hardcoded 1; parsePassengerCount is
// the single reader flight-detail and checkout now share.
describe('parsePassengerCount', () => {
  it('defaults to a single traveler for missing / invalid input', () => {
    expect(parsePassengerCount(null)).toBe(1)
    expect(parsePassengerCount(undefined)).toBe(1)
    expect(parsePassengerCount('')).toBe(1)
    expect(parsePassengerCount('abc')).toBe(1)
  })

  it('rejects zero and negative counts', () => {
    expect(parsePassengerCount('0')).toBe(1)
    expect(parsePassengerCount('-3')).toBe(1)
  })

  it('reads a valid count', () => {
    expect(parsePassengerCount('2')).toBe(2)
    expect(parsePassengerCount('4')).toBe(4)
  })

  it('floors a fractional count', () => {
    expect(parsePassengerCount('3.9')).toBe(3)
  })

  it('clamps an absurd (hand-edited) count to MAX_PASSENGERS', () => {
    expect(parsePassengerCount('9999')).toBe(MAX_PASSENGERS)
  })
})
