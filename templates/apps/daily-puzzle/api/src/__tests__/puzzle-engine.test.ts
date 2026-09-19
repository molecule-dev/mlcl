import { describe, expect, it } from 'vitest'

import {
  applyResultToStats,
  buildShareText,
  computeFeedback,
  emptyStats,
  isValidDateKey,
  MAX_GUESSES,
  normalizeGuess,
  pickWordForDate,
  todayUtc,
  WORD_LENGTH,
} from '../lib/puzzle-engine.js'

describe('date helpers', () => {
  it('todayUtc is a UTC YYYY-MM-DD key', () => {
    expect(todayUtc(new Date('2026-09-19T23:30:00.000Z'))).toBe('2026-09-19')
    // 23:30 UTC on the 19th is already the 20th in UTC+1 — the key must NOT shift
    expect(todayUtc(new Date('2026-01-01T00:30:00.000Z'))).toBe('2026-01-01')
  })

  it('isValidDateKey accepts real dates and rejects malformed ones', () => {
    expect(isValidDateKey('2026-02-28')).toBe(true)
    expect(isValidDateKey('2026-13-01')).toBe(false)
    expect(isValidDateKey('2026-02-30')).toBe(false) // rolls over to March
    expect(isValidDateKey('20260228')).toBe(false)
    expect(isValidDateKey('not-a-date')).toBe(false)
  })
})

describe('pickWordForDate (deterministic, no cron)', () => {
  const list = ['about', 'crane', 'music', 'ocean', 'piano', 'stone']

  it('returns the same word for the same date, every call', () => {
    const a = pickWordForDate('2026-09-19', list)
    for (let i = 0; i < 5; i++) expect(pickWordForDate('2026-09-19', list)).toBe(a)
    expect(list).toContain(a)
  })

  it('is stable against list permutation ONLY via sorting contract — sorted input is stable', () => {
    const sorted = [...list].sort()
    expect(pickWordForDate('2026-03-01', sorted)).toBe(pickWordForDate('2026-03-01', sorted))
  })

  it('different dates land on (mostly) different words across a month', () => {
    const picks = new Set<string>()
    for (let d = 1; d <= 30; d++) {
      const date = `2026-09-${String(d).padStart(2, '0')}`
      picks.add(pickWordForDate(date, list))
    }
    // With a 6-word list a month MUST visit several distinct answers.
    expect(picks.size).toBeGreaterThan(1)
  })

  it('throws on an empty word list instead of serving undefined', () => {
    expect(() => pickWordForDate('2026-09-19', [])).toThrow(/empty word list/)
  })
})

describe('computeFeedback (two-pass, duplicate-safe)', () => {
  it('marks exact-position letters correct', () => {
    expect(computeFeedback('crane', 'crane')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ])
  })

  it('marks misplaced letters present', () => {
    expect(computeFeedback('stone', 'tones')).toEqual([
      'present',
      'present',
      'present',
      'present',
      'present',
    ])
  })

  it('marks unknown letters absent', () => {
    expect(computeFeedback('zzzzz', 'crane')).toEqual([
      'absent',
      'absent',
      'absent',
      'absent',
      'absent',
    ])
  })

  it('never yields more yellows than the answer contains (the classic double-letter trap)', () => {
    // Answer has ONE o; both o's in the guess cannot both be present.
    expect(computeFeedback('robot', 'ocean')).toEqual([
      'absent',
      'present',
      'absent',
      'absent',
      'absent',
    ])
  })

  it('splits duplicated letters green-first, one yellow per remaining copy', () => {
    // Answer abbey has two b's; guess babes places one exactly (green) and
    // misplaces the other (yellow) — never two yellows, never two greens.
    expect(computeFeedback('babes', 'abbey')).toEqual([
      'present',
      'present',
      'correct',
      'correct',
      'absent',
    ])
  })
})

describe('normalizeGuess', () => {
  it('accepts 5 lowercase letters, trims and lowercases input', () => {
    expect(normalizeGuess('crane')).toBe('crane')
    expect(normalizeGuess('  CRANE ')).toBe('crane')
  })

  it('rejects wrong length, digits, and non-strings', () => {
    expect(normalizeGuess('cranes')).toBeNull()
    expect(normalizeGuess('cran')).toBeNull()
    expect(normalizeGuess('cr4ne')).toBeNull()
    expect(normalizeGuess(42)).toBeNull()
    expect(normalizeGuess(null)).toBeNull()
  })
})

describe('applyResultToStats (the user_stats fold)', () => {
  it('a win starts a streak and bins the attempt count', () => {
    const next = applyResultToStats(emptyStats(), true, 3)
    expect(next).toEqual({
      played: 1,
      wins: 1,
      current_streak: 1,
      max_streak: 1,
      distribution: { '3': 1 },
    })
  })

  it('consecutive wins extend current and max streak; losses reset current only', () => {
    let stats = emptyStats()
    stats = applyResultToStats(stats, true, 2)
    stats = applyResultToStats(stats, true, 4)
    stats = applyResultToStats(stats, true, 1)
    expect(stats.current_streak).toBe(3)
    expect(stats.max_streak).toBe(3)
    stats = applyResultToStats(stats, false, 6)
    expect(stats.current_streak).toBe(0)
    expect(stats.max_streak).toBe(3) // max survives the loss
    expect(stats.wins).toBe(3)
    expect(stats.played).toBe(4)
    stats = applyResultToStats(stats, true, 5)
    expect(stats.current_streak).toBe(1)
    expect(stats.max_streak).toBe(3)
  })

  it('a loss is never binned in the distribution', () => {
    const next = applyResultToStats(applyResultToStats(emptyStats(), false, 6), true, 2)
    expect(next.distribution).toEqual({ '2': 1 })
  })
})

describe('buildShareText', () => {
  const guesses = [
    { word: 'stone', feedback: computeFeedback('stone', 'crane') },
    { word: 'crane', feedback: computeFeedback('crane', 'crane') },
  ]

  it('renders the emoji grid with header and streak line', () => {
    const text = buildShareText(123, guesses, true, { current_streak: 4 })
    const lines = text.split('\n')
    expect(lines[0]).toBe(`Daily Puzzle #123 ✅ 2/${MAX_GUESSES}`)
    expect(lines[1]).toBe('⬛⬛⬛🟩🟩')
    expect(lines[2]).toBe('🟩🟩🟩🟩🟩')
    expect(lines[3]).toBe('🔥 4')
  })

  it('marks a lost game with ❌ and six rows', () => {
    const lost = Array.from({ length: MAX_GUESSES }, () => ({
      word: 'stone',
      feedback: computeFeedback('stone', 'crane'),
    }))
    const text = buildShareText(9, lost, false)
    expect(text.split('\n')[0]).toBe(`Daily Puzzle #9 ❌ ${MAX_GUESSES}/${MAX_GUESSES}`)
    expect(text.split('\n')).toHaveLength(MAX_GUESSES + 1)
  })
})

describe('game constants', () => {
  it('the board is 5 letters by 6 guesses', () => {
    expect(WORD_LENGTH).toBe(5)
    expect(MAX_GUESSES).toBe(6)
  })
})
