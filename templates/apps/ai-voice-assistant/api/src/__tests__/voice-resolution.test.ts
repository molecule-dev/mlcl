import { beforeEach, describe, expect, it, vi } from 'vitest'

// The user's Settings voice (oauthData.voicePreferences.voice) and a bound agent's voice_id
// were both stored + shown, but the /speech/synthesize calls sent { text } only, so TTS always
// used the provider's built-in default. resolvePreferredVoice resolves the effective voice
// server-side: bound-agent voice → user preference → the 'alloy' Settings default.

const findById = vi.fn()
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(...a),
}))

import { resolvePreferredVoice } from '../lib/voice.js'

type Row = Record<string, unknown> | null
const dispatch = (rows: { conversations?: Row; agents?: Row; users?: Row }) => {
  findById.mockImplementation((table: string) => {
    if (table === 'conversations') return Promise.resolve(rows.conversations ?? null)
    if (table === 'agents') return Promise.resolve(rows.agents ?? null)
    if (table === 'users') return Promise.resolve(rows.users ?? null)
    return Promise.resolve(null)
  })
}

beforeEach(() => vi.clearAllMocks())

describe('resolvePreferredVoice', () => {
  it("uses the bound agent's voice_id when the conversation is agent-bound and owned", async () => {
    dispatch({
      conversations: { id: 'c1', user_id: 'u1', agent_id: 'a1' },
      agents: { id: 'a1', user_id: 'u1', voice_id: 'nova' },
      users: { id: 'u1', oauthData: { voicePreferences: { voice: 'echo' } } },
    })
    expect(await resolvePreferredVoice('u1', 'c1')).toBe('nova')
  })

  it('falls back to the preference voice when the bound agent has no voice_id', async () => {
    dispatch({
      conversations: { id: 'c1', user_id: 'u1', agent_id: 'a1' },
      agents: { id: 'a1', user_id: 'u1', voice_id: null },
      users: { id: 'u1', oauthData: { voicePreferences: { voice: 'shimmer' } } },
    })
    expect(await resolvePreferredVoice('u1', 'c1')).toBe('shimmer')
  })

  it('ignores an agent voice on a conversation the requester does not own (IDOR guard)', async () => {
    dispatch({
      conversations: { id: 'c1', user_id: 'someone-else', agent_id: 'a1' },
      agents: { id: 'a1', user_id: 'someone-else', voice_id: 'nova' },
      users: { id: 'u1', oauthData: { voicePreferences: { voice: 'echo' } } },
    })
    expect(await resolvePreferredVoice('u1', 'c1')).toBe('echo')
  })

  it('uses the preference voice when no conversation is given', async () => {
    dispatch({ users: { id: 'u1', oauthData: { voicePreferences: { voice: 'fable' } } } })
    expect(await resolvePreferredVoice('u1')).toBe('fable')
  })

  it('parses a JSON-string oauthData (JSONB round-trips as text)', async () => {
    dispatch({
      users: { id: 'u1', oauthData: JSON.stringify({ voicePreferences: { voice: 'onyx' } }) },
    })
    expect(await resolvePreferredVoice('u1')).toBe('onyx')
  })

  it("defaults to 'alloy' (the Settings default) when the user has no configured voice", async () => {
    dispatch({ users: { id: 'u1', oauthData: {} } })
    expect(await resolvePreferredVoice('u1')).toBe('alloy')
    dispatch({ users: null })
    expect(await resolvePreferredVoice('u1')).toBe('alloy')
  })
})
