import { describe, expect, it } from 'vitest'

import { nextRotationDue, soonestRotation } from '../lib/rotation.js'

// Vaults have a next_rotation column the UI reads for the rotation pill + expiring filter, but it was
// never computed from the secrets' rotation_days + last_rotated_at. These helpers derive it.

describe('nextRotationDue', () => {
  it('adds rotation_days to last_rotated_at', () => {
    expect(
      nextRotationDue({ rotation_days: 30, last_rotated_at: '2026-01-01T00:00:00.000Z' }),
    ).toEqual(new Date('2026-01-31T00:00:00.000Z'))
  })
  it('returns null when the secret does not rotate (rotation_days <= 0)', () => {
    expect(
      nextRotationDue({ rotation_days: 0, last_rotated_at: '2026-01-01T00:00:00.000Z' }),
    ).toBeNull()
  })
  it('returns null when never rotated or invalid', () => {
    expect(nextRotationDue({ rotation_days: 30, last_rotated_at: null })).toBeNull()
    expect(nextRotationDue({ rotation_days: 30, last_rotated_at: 'not-a-date' })).toBeNull()
  })
})

describe('soonestRotation', () => {
  it('picks the earliest upcoming rotation across secrets', () => {
    expect(
      soonestRotation([
        { rotation_days: 30, last_rotated_at: '2026-01-01T00:00:00.000Z' },
        { rotation_days: 7, last_rotated_at: '2026-01-01T00:00:00.000Z' },
      ]),
    ).toBe('2026-01-08T00:00:00.000Z')
  })
  it('ignores non-rotating secrets and returns null when none rotate', () => {
    expect(
      soonestRotation([
        { rotation_days: 0, last_rotated_at: '2026-01-01T00:00:00.000Z' },
        { rotation_days: 90, last_rotated_at: null },
      ]),
    ).toBeNull()
    expect(soonestRotation([])).toBeNull()
  })
})
