import { describe, expect, it } from 'vitest'

import { detectLanguage, resolveReplyLanguage, scriptedReply } from '../lib/languages.js'
import {
  computeNightlyRateCents,
  countNights,
  isoPlusDays,
  nextFridayIso,
  PmsError,
  STATUS_TRANSITIONS,
} from '../lib/pms.js'

describe('lib/pms date helpers', () => {
  it('countNights computes whole nights and rejects inverted ranges', () => {
    expect(countNights('2026-09-01', '2026-09-04')).toBe(3)
    expect(() => countNights('2026-09-04', '2026-09-01')).toThrow(PmsError)
    expect(() => countNights('2026-09-01', '2026-09-01')).toThrow(PmsError)
  })

  it('isoPlusDays moves across month boundaries', () => {
    expect(isoPlusDays(1, new Date('2026-09-30T00:00:00Z'))).toBe('2026-10-01')
  })

  it('nextFridayIso lands on a Friday', () => {
    const friday = nextFridayIso(new Date('2026-09-19T00:00:00Z'))
    expect(new Date(friday + 'T00:00:00Z').getUTCDay()).toBe(5)
  })
})

describe('lib/pms rate computation', () => {
  const roomType = { base_rate_cents: 12900 }

  it('returns the base rate when no plan is active', () => {
    expect(computeNightlyRateCents(roomType, [], '2026-09-01')).toBe(12900)
  })

  it('applies the weekend adjustment on Fri/Sat and the weekday adjustment otherwise', () => {
    // 2026-09-17 is a Thursday, 2026-09-18 a Friday.
    const plans = [
      {
        weekday_adjustment_percent: 0,
        weekend_adjustment_percent: 15,
        seasonal_override_cents: null,
        seasonal_start: null,
        seasonal_end: null,
        active: true,
      },
    ]
    expect(computeNightlyRateCents(roomType, plans, '2026-09-17')).toBe(12900)
    expect(computeNightlyRateCents(roomType, plans, '2026-09-18')).toBe(14835)
  })

  it('the seasonal override wins inside its window', () => {
    const plans = [
      {
        weekday_adjustment_percent: 0,
        weekend_adjustment_percent: 15,
        seasonal_override_cents: 9900,
        seasonal_start: '2026-09-01',
        seasonal_end: '2026-09-30',
        active: true,
      },
    ]
    expect(computeNightlyRateCents(roomType, plans, '2026-09-18')).toBe(9900)
    expect(computeNightlyRateCents(roomType, plans, '2026-10-01')).toBe(12900)
  })

  it('inactive plans are ignored', () => {
    const plans = [
      {
        weekday_adjustment_percent: 50,
        weekend_adjustment_percent: 50,
        seasonal_override_cents: null,
        seasonal_start: null,
        seasonal_end: null,
        active: false,
      },
    ]
    expect(computeNightlyRateCents(roomType, plans, '2026-09-17')).toBe(12900)
  })
})

describe('lib/pms lifecycle', () => {
  it('the status transition table is acyclic and terminal states are frozen', () => {
    expect(STATUS_TRANSITIONS.checked_out).toEqual([])
    expect(STATUS_TRANSITIONS.cancelled).toEqual([])
    expect(STATUS_TRANSITIONS.no_show).toEqual([])
    expect(STATUS_TRANSITIONS.confirmed).toContain('checked_in')
    expect(STATUS_TRANSITIONS.held).not.toContain('checked_out')
  })
})

describe('lib/languages detection', () => {
  it('detects the seeded languages from real caller utterances', () => {
    expect(detectLanguage('Hello, I would like to book a room for two nights')).toBe('en')
    expect(detectLanguage('Hola, ¿tienen habitaciones libres este fin de semana?')).toBe('es')
    expect(detectLanguage('Bonjour, je voudrais réserver une chambre pour deux nuits')).toBe('fr')
    expect(detectLanguage('Guten Abend, ich möchte ein Zimmer für zwei Nächte reservieren')).toBe(
      'de',
    )
    expect(detectLanguage('你好，我想预订一间房，住两个晚上')).toBe('zh')
    expect(detectLanguage('こんにちは、部屋を予約したいのですが')).toBe('ja')
  })

  it('falls back to English for unknown or empty text', () => {
    expect(detectLanguage('xyzzy plugh')).toBe('en')
    expect(detectLanguage('')).toBe('en')
  })

  it('resolveReplyLanguage switches to the agent first language when the detected one is not spoken', () => {
    expect(resolveReplyLanguage('fr', ['en', 'es'])).toBe('en')
    expect(resolveReplyLanguage('es', ['en', 'es'])).toBe('es')
  })
})

describe('lib/languages scripted replies', () => {
  it('interpolates booking details into every language', () => {
    for (const lang of ['en', 'es', 'fr', 'de', 'zh', 'ja']) {
      const reply = scriptedReply(lang, 'booked', {
        roomTypeName: 'Standard Queen',
        checkIn: '2026-09-25',
        checkOut: '2026-09-27',
        totalCents: 29670,
        confirmationCode: 'ABCD1234',
      })
      expect(reply).toContain('ABCD1234')
      expect(reply.length).toBeGreaterThan(10)
    }
  })

  it('falls back to English for an unsupported language', () => {
    expect(scriptedReply('xx', 'greeting')).toBe(scriptedReply('en', 'greeting'))
  })
})
