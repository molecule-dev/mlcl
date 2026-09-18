/**
 * Per-app handler unit tests — exercise the behaviour added in this template
 * (agents CRUD, conversations + AI message flow, voice-aware seconds tracking,
 * and the user voice-preferences endpoint).
 *
 * These tests boot just the express handler under test with mocked DataStore /
 * AI provider, so they assert real branch logic (validation errors, IDOR
 * scoping, persistence shape) without requiring Postgres or a network round
 * trip to Anthropic. We avoid supertest by spinning up an ephemeral
 * `http.createServer` on port 0 and using global `fetch`.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  findById: vi.fn() as ReturnType<typeof vi.fn>,
  findMany: vi.fn() as ReturnType<typeof vi.fn>,
  create: vi.fn() as ReturnType<typeof vi.fn>,
  updateById: vi.fn() as ReturnType<typeof vi.fn>,
  deleteById: vi.fn() as ReturnType<typeof vi.fn>,
}))

type ChatEvent = { type: string; content: string }
type Provider = { chat: (params?: Record<string, unknown>) => AsyncGenerator<ChatEvent> }
const aiMock = vi.hoisted(() => ({
  requireProvider: vi.fn((): Provider => ({
    chat: async function* () {
      yield { type: 'text', content: 'mocked-assistant-reply' }
    },
  })),
}))

vi.mock('@molecule/api-database', () => dbMock)
vi.mock('@molecule/api-ai', () => aiMock)
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

interface SessionLocals {
  session?: { userId?: string }
}

let server: http.Server | null = null
async function listen(handler: express.Router, userId: string | null): Promise<string> {
  const app = express()
  app.use(express.json())
  app.use((_req, res: express.Response & { locals: SessionLocals }, next) => {
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use(handler)
  server = http.createServer(app)
  await new Promise<void>((resolve) => server?.listen(0, resolve))
  const addr = server?.address() as AddressInfo
  return `http://127.0.0.1:${String(addr.port)}`
}

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.findMany.mockImplementation(async () => [])
  dbMock.deleteById.mockImplementation(async () => ({}))
})

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => resolve())
  })
  server = null
})

describe('agents handler', () => {
  it('returns 401 when no session', async () => {
    const router = (await import('../handlers/agents.js')).default
    const url = await listen(router, null)
    const res = await fetch(`${url}/`)
    expect(res.status).toBe(401)
  })

  it('lists only the calling user’s agents (IDOR guard)', async () => {
    dbMock.findMany.mockImplementation(async () => [{ id: 'a1', user_id: 'u1', name: 'Mine' }])
    const router = (await import('../handlers/agents.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/`)
    expect(res.status).toBe(200)
    expect(dbMock.findMany).toHaveBeenCalledWith(
      'agents',
      expect.objectContaining({
        where: [{ field: 'user_id', operator: '=', value: 'u1' }],
      }),
    )
  })

  it('rejects invalid create payloads', async () => {
    const router = (await import('../handlers/agents.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ system_prompt: 123 }),
    })
    expect(res.status).toBe(400)
  })

  it('persists a new agent owned by the caller', async () => {
    dbMock.create.mockImplementation(async (_t: string, data: Record<string, unknown>) => ({
      data: { id: 'a-new', ...data },
    }))
    const router = (await import('../handlers/agents.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Mentor', system_prompt: 'Be kind', voice_id: 'alloy' }),
    })
    expect(res.status).toBe(201)
    expect(dbMock.create).toHaveBeenCalledWith(
      'agents',
      expect.objectContaining({
        user_id: 'u1',
        name: 'Mentor',
        voice_id: 'alloy',
      }),
    )
  })

  it('refuses to delete an agent owned by another user', async () => {
    dbMock.findById.mockImplementation(async () => ({ id: 'a1', user_id: 'u-other' }))
    const router = (await import('../handlers/agents.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/11111111-1111-4111-8111-111111111111`, { method: 'DELETE' })
    expect(res.status).toBe(404)
    expect(dbMock.deleteById).not.toHaveBeenCalled()
  })

  it('deletes when the caller owns the agent', async () => {
    dbMock.findById.mockImplementation(async () => ({ id: 'a1', user_id: 'u1' }))
    const router = (await import('../handlers/agents.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/11111111-1111-4111-8111-111111111111`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(dbMock.deleteById).toHaveBeenCalledWith('agents', '11111111-1111-4111-8111-111111111111')
  })
})

describe('conversations handler', () => {
  it('rejects unauthenticated callers', async () => {
    const router = (await import('../handlers/conversations.js')).default
    const url = await listen(router, null)
    const res = await fetch(`${url}/`)
    expect(res.status).toBe(401)
  })

  it('persists user + assistant messages with type=voice and accumulates total_seconds_spoken', async () => {
    dbMock.findById.mockImplementation(async () => ({
      id: 'c1',
      user_id: 'u1',
      total_seconds_spoken: 10,
    }))
    dbMock.findMany.mockImplementation(async () => [])
    const created: Array<Record<string, unknown>> = []
    dbMock.create.mockImplementation(async (_t: string, data: Record<string, unknown>) => {
      created.push(data)
      return { data: { id: `m-${String(created.length)}`, ...data } }
    })
    const updated: Array<Record<string, unknown>> = []
    dbMock.updateById.mockImplementation(
      async (_t: string, _id: string, data: Record<string, unknown>) => {
        updated.push(data)
        return { data: {} }
      },
    )

    const router = (await import('../handlers/conversations.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/11111111-1111-4111-8111-111111111111/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hi', type: 'voice', duration_ms: 12500 }),
    })

    expect(res.status).toBe(200)
    expect(created.length).toBeGreaterThanOrEqual(2)
    expect(created[0]).toMatchObject({ role: 'user', type: 'voice', duration_ms: 12500 })
    expect(created[1]).toMatchObject({ role: 'assistant', content: 'mocked-assistant-reply' })
    expect(updated[0]?.total_seconds_spoken).toBe(10 + 13)
  })

  it('does not bump total_seconds_spoken for text messages', async () => {
    dbMock.findById.mockImplementation(async () => ({
      id: 'c1',
      user_id: 'u1',
      total_seconds_spoken: 0,
    }))
    dbMock.create.mockImplementation(async () => ({ data: { id: 'm', content: '' } }))
    const updates: Array<Record<string, unknown>> = []
    dbMock.updateById.mockImplementation(
      async (_t: string, _id: string, data: Record<string, unknown>) => {
        updates.push(data)
        return { data: {} }
      },
    )

    const router = (await import('../handlers/conversations.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/11111111-1111-4111-8111-111111111111/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hi typed' }),
    })

    expect(res.status).toBe(200)
    expect(updates[0]).not.toHaveProperty('total_seconds_spoken')
  })

  it('refuses to read another user’s conversation', async () => {
    dbMock.findById.mockImplementation(async () => ({ id: 'c1', user_id: 'u-other' }))
    const router = (await import('../handlers/conversations.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/11111111-1111-4111-8111-111111111111`)
    expect(res.status).toBe(404)
  })

  it('passes the bound agent’s configured model to the chat call', async () => {
    // conversation → its agent (owned by the same user) carries a non-default model.
    dbMock.findById.mockImplementation(async (table: string) =>
      table === 'agents'
        ? {
            id: 'a1',
            user_id: 'u1',
            name: 'Mentor',
            system_prompt: 'Be a mentor',
            voice_id: null,
            model: 'claude-opus-4-8',
          }
        : { id: 'c1', user_id: 'u1', agent_id: 'a1', total_seconds_spoken: 0 },
    )
    dbMock.create.mockImplementation(async () => ({ data: { id: 'm', content: '' } }))
    dbMock.updateById.mockImplementation(async () => ({ data: {} }))
    const chatParams: Array<Record<string, unknown>> = []
    aiMock.requireProvider.mockReturnValue({
      chat: async function* (params?: Record<string, unknown>) {
        chatParams.push(params ?? {})
        yield { type: 'text', content: 'reply' }
      },
    })

    const router = (await import('../handlers/conversations.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/11111111-1111-4111-8111-111111111111/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hi', type: 'text' }),
    })

    expect(res.status).toBe(200)
    expect(chatParams[0]?.model).toBe('claude-opus-4-8')
    expect(chatParams[0]?.system).toBe('Be a mentor')
  })

  it('leaves the model unset (provider default) when the conversation has no agent', async () => {
    dbMock.findById.mockImplementation(async () => ({
      id: 'c1',
      user_id: 'u1',
      agent_id: null,
      total_seconds_spoken: 0,
    }))
    dbMock.create.mockImplementation(async () => ({ data: { id: 'm', content: '' } }))
    dbMock.updateById.mockImplementation(async () => ({ data: {} }))
    const chatParams: Array<Record<string, unknown>> = []
    aiMock.requireProvider.mockReturnValue({
      chat: async function* (params?: Record<string, unknown>) {
        chatParams.push(params ?? {})
        yield { type: 'text', content: 'reply' }
      },
    })

    const router = (await import('../handlers/conversations.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/11111111-1111-4111-8111-111111111111/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hi', type: 'text' }),
    })

    expect(res.status).toBe(200)
    expect(chatParams[0]?.model).toBeUndefined()
  })
})

describe('preferences handler', () => {
  it('returns defaults when nothing stored yet', async () => {
    dbMock.findById.mockImplementation(async () => ({ id: 'u1', oauthData: {} }))
    const router = (await import('../handlers/preferences.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      voice: 'alloy',
      language: 'en-US',
      voicePlaybackEnabled: true,
    })
  })

  it('persists merged updates back into users.oauthData.voicePreferences', async () => {
    dbMock.findById.mockImplementation(async () => ({
      id: 'u1',
      oauthData: { other: 'keep-me', voicePreferences: { voice: 'echo', language: 'en-GB' } },
    }))
    const updates: Array<Record<string, unknown>> = []
    dbMock.updateById.mockImplementation(async (_t, _id, data) => {
      updates.push(data)
      return { data: {} }
    })

    const router = (await import('../handlers/preferences.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        voice: 'nova',
        voicePlaybackEnabled: false,
        privacy: { training: true },
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      voice: string
      language: string
      privacy: Record<string, boolean>
      voicePlaybackEnabled: boolean
    }
    expect(body.voice).toBe('nova')
    expect(body.language).toBe('en-GB')
    expect(body.privacy.training).toBe(true)
    expect(body.voicePlaybackEnabled).toBe(false)

    const oauthData = updates[0]?.oauthData as Record<string, unknown>
    expect(oauthData.other).toBe('keep-me')
    const stored = oauthData.voicePreferences as { voice: string; language: string }
    expect(stored.voice).toBe('nova')
    expect(stored.language).toBe('en-GB')
  })

  it('rejects unknown keys (strict schema)', async () => {
    const router = (await import('../handlers/preferences.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ unknownField: true }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 401 without a session', async () => {
    const router = (await import('../handlers/preferences.js')).default
    const urlGet = await listen(router, null)
    expect((await fetch(`${urlGet}/`)).status).toBe(401)
    server?.close()
    server = null
    const urlPut = await listen(router, null)
    expect(
      (
        await fetch(`${urlPut}/`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(401)
  })
})
