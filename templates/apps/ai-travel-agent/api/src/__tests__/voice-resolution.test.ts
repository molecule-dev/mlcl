import { beforeEach, describe, expect, it, vi } from 'vitest'

// The clients send { text } only to /speech/synthesize, so the voice the user
// picked in Settings (oauthData.travelPreferences.voice) is resolved here.

const findById = vi.fn()
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(...a),
}))

import { resolvePreferredVoice } from '../lib/voice.js'

beforeEach(() => vi.clearAllMocks())

describe('resolvePreferredVoice', () => {
  it('uses the saved preference voice', async () => {
    findById.mockResolvedValue({ id: 'u1', oauthData: { travelPreferences: { voice: 'echo' } } })
    expect(await resolvePreferredVoice('u1')).toBe('echo')
  })

  it('parses oauthData stored as a JSON string', async () => {
    findById.mockResolvedValue({
      id: 'u1',
      oauthData: JSON.stringify({ travelPreferences: { voice: 'nova' } }),
    })
    expect(await resolvePreferredVoice('u1')).toBe('nova')
  })

  it('falls back to alloy when nothing is stored', async () => {
    findById.mockResolvedValue({ id: 'u1', oauthData: null })
    expect(await resolvePreferredVoice('u1')).toBe('alloy')
  })

  it('falls back to alloy when the stored voice is blank', async () => {
    findById.mockResolvedValue({ id: 'u1', oauthData: { travelPreferences: { voice: '  ' } } })
    expect(await resolvePreferredVoice('u1')).toBe('alloy')
  })

  it('falls back to alloy when the user row is missing', async () => {
    findById.mockResolvedValue(null)
    expect(await resolvePreferredVoice('u1')).toBe('alloy')
  })
})
