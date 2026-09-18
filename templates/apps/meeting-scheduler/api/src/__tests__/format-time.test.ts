import { describe, expect, it } from 'vitest'

import { formatInTimezone } from '../lib/format-time.js'

// Booking confirmation emails showed a hardcoded UTC time, ignoring the stored
// invitee_timezone (and the host's availability timezone). formatInTimezone is
// the shared helper the emails now use to localize the meeting time per recipient.

// 17:00 UTC on 2025-03-03 — before US DST (starts Mar 9 2025), so New York is
// UTC-5 (12:00) and Los Angeles is UTC-8 (09:00).
const instant = new Date('2025-03-03T17:00:00Z')

describe('formatInTimezone', () => {
  it('localizes the instant to the given timezone (New York → 12:00)', () => {
    const ny = formatInTimezone(instant, 'America/New_York')
    expect(ny).toContain('12:00')
    expect(ny).toContain('Mar 3')
    expect(ny).not.toContain('5:00') // not the raw UTC hour
  })

  it('shows the UTC time for a UTC timezone (→ 5:00)', () => {
    expect(formatInTimezone(instant, 'UTC')).toContain('5:00')
  })

  it('produces a different time for a different timezone (LA ≠ NY)', () => {
    expect(formatInTimezone(instant, 'America/Los_Angeles')).not.toBe(
      formatInTimezone(instant, 'America/New_York'),
    )
  })

  it('falls back to a UTC string for an invalid timezone (no throw)', () => {
    expect(formatInTimezone(instant, 'Not/AZone')).toContain('UTC')
    expect(() => formatInTimezone(instant, '')).not.toThrow()
  })
})
