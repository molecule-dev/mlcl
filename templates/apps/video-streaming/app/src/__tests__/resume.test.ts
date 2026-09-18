import { describe, expect, it } from 'vitest'

import { resumePosition } from '../lib/resume.js'

// watch_history.position_sec was saved + surfaced as a "Resume" button but the player never sought
// to it. resumePosition is the pure decision the player now applies on load.
describe('resumePosition', () => {
  it('starts from 0 when there is no saved progress', () => {
    expect(resumePosition(0, 100)).toBe(0)
    expect(resumePosition(-5, 100)).toBe(0)
    expect(resumePosition(Number.NaN, 100)).toBe(0)
  })

  it('resumes to the saved position mid-video', () => {
    expect(resumePosition(30, 100)).toBe(30)
    expect(resumePosition(94, 100)).toBe(94)
  })

  it('restarts when the saved position is within the last few seconds of a known duration', () => {
    expect(resumePosition(95, 100)).toBe(0) // exactly duration - 5
    expect(resumePosition(98, 100)).toBe(0)
    expect(resumePosition(100, 100)).toBe(0)
  })

  it('resumes to the saved position when the duration is unknown', () => {
    expect(resumePosition(30, 0)).toBe(30)
    expect(resumePosition(30, Number.NaN)).toBe(30)
  })
})
