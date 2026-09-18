import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// user_preferences.default_tone (Settings "Default tone preset") was persisted but never reached
// generation: /content read only body.tone, and /rewrite used a hardcoded prompt with no tone. Both
// now default the tone from the stored preference (an explicit body.tone still wins).

const chat = vi.fn()
vi.mock('@molecule/api-ai', () => ({
  getProviderByName: (name: string) => (name === 'anthropic' ? { chat } : null),
}))
const db = {
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  create: vi.fn(async (..._a: unknown[]) => ({ data: { id: 's1' } })),
  count: vi.fn(async (..._a: unknown[]) => 0),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_r: Request, _s: Response, n: () => void) => n(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

import router from '../handlers/generate.js'

function handlerFor(path: string): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods.post)
  if (!layer?.route) throw new Error(`POST ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response
const systemPrompt = () =>
  (chat.mock.calls[0]?.[0] as { system?: string } | undefined)?.system ?? ''
const withDefaultTone = (tone: string | null) =>
  db.findMany.mockImplementation((table: unknown) =>
    Promise.resolve(
      (table === 'user_preferences' && tone ? [{ default_tone: tone }] : []) as unknown[],
    ),
  )

beforeEach(() => {
  vi.clearAllMocks()
  chat.mockReturnValue(
    (async function* () {
      yield { type: 'text', content: 'ok' }
      yield { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } }
    })(),
  )
})

describe('generate defaults the tone from the saved preference', () => {
  it('/rewrite applies the stored default_tone', async () => {
    withDefaultTone('Academic')
    await handlerFor('/rewrite')(
      { body: { content: 'Some text.' } } as unknown as Request,
      makeRes(),
    )
    expect(systemPrompt()).toContain('Write in a Academic tone.')
  })

  it('/content defaults tone to the stored default_tone when the body omits it', async () => {
    withDefaultTone('Casual')
    await handlerFor('/content')(
      { body: { prompt: 'Write about cats.' } } as unknown as Request,
      makeRes(),
    )
    expect(systemPrompt()).toContain('Write in a Casual tone.')
  })

  it('/content honors an explicit body.tone over the preference', async () => {
    withDefaultTone('Casual')
    await handlerFor('/content')(
      { body: { prompt: 'x', tone: 'Formal' } } as unknown as Request,
      makeRes(),
    )
    expect(systemPrompt()).toContain('Write in a Formal tone.')
    expect(systemPrompt()).not.toContain('Casual')
  })

  it('/rewrite omits the tone clause when no default is set', async () => {
    withDefaultTone(null)
    await handlerFor('/rewrite')(
      { body: { content: 'Some text.' } } as unknown as Request,
      makeRes(),
    )
    expect(systemPrompt()).not.toContain(' tone.')
  })
})
