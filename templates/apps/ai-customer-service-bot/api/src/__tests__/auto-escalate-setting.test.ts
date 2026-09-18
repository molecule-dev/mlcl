import { beforeEach, describe, expect, it, vi } from 'vitest'

// The bot escalated a conversation (flip status + open an escalation) whenever the model emitted
// the [ESCALATE] token — unconditionally. The operator's stored auto_escalate setting (default on)
// was never read, so turning it off did nothing. Escalation must now honor the setting; the token
// is still stripped from the visible reply either way.

const chat = vi.fn()
vi.mock('@molecule/api-ai', () => ({
  hasProvider: () => true,
  getProviderByName: () => ({ chat }),
  requireProvider: () => ({ chat }),
}))
const db = {
  create: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))

import { generateAiReply } from '../lib/ai-reply.js'

const escalationCreated = () => db.create.mock.calls.some((c) => c[0] === 'escalations')
const convUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'conversations')?.[2] as
    Record<string, unknown> | undefined
const run = (settings: Record<string, unknown> | null) => {
  db.findMany.mockResolvedValue([])
  db.findOne.mockResolvedValue(settings)
  db.create.mockResolvedValue({ data: { id: 'm1' } })
  db.updateById.mockResolvedValue({ data: {} })
  chat.mockReturnValue(
    (async function* () {
      yield { type: 'text', content: 'Let me bring in a teammate. [ESCALATE]' }
    })(),
  )
  return generateAiReply({
    conversation: { id: 'c1', customer_name: 'Bob', message_count: 0 },
    ownerId: 'o1',
  } as Parameters<typeof generateAiReply>[0])
}

beforeEach(() => vi.clearAllMocks())

describe('auto_escalate gates the [ESCALATE] action', () => {
  it('escalates when auto_escalate is on and the model requests it', async () => {
    await run({ auto_escalate: true })
    expect(escalationCreated()).toBe(true)
    expect(convUpdate()?.status).toBe('escalated')
  })

  it('does NOT escalate when auto_escalate is off, even if the model requests it', async () => {
    await run({ auto_escalate: false })
    expect(escalationCreated()).toBe(false)
    expect(convUpdate()?.status).toBeUndefined()
  })

  it('defaults to escalating when no settings row exists', async () => {
    await run(null)
    expect(escalationCreated()).toBe(true)
  })
})

describe('bot_tone shapes the system prompt', () => {
  // The tone select ships warm/brief/formal, but the tonePhrase map had no 'brief'
  // key, so "Brief + direct" silently fell back to the warm phrase.
  const systemPromptFor = async (bot_tone: string): Promise<string> => {
    await run({ bot_tone })
    const args = chat.mock.calls[0]?.[0] as { system?: string } | undefined
    return args?.system ?? ''
  }

  it('applies the "brief" tone (previously swallowed → warm fallback)', async () => {
    const s = await systemPromptFor('brief')
    expect(s).toContain('Brief and direct')
    expect(s).not.toContain('trusted concierge') // the warm phrase it used to fall back to
  })

  it('still applies "warm"', async () => {
    expect(await systemPromptFor('warm')).toContain('trusted concierge')
  })

  it('still applies "formal"', async () => {
    expect(await systemPromptFor('formal')).toContain('formal business correspondence')
  })
})
