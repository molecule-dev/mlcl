import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A bot's `model` is a stored, user-selected column, but the chat completion call forwarded only
// system/maxTokens/temperature and omitted model — so every conversation ran on the AI bond's
// default model regardless of the bot's Model Selection. The chat call must pass bot.model.

const chat = vi.fn()
vi.mock('@molecule/api-ai', () => ({ requireProvider: () => ({ chat }) }))

const db = {
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  create: vi.fn(),
  count: vi.fn(async (..._a: unknown[]) => 0),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('../lib/authz.js', () => ({
  requireBotChildOwnership: vi.fn(async () => ({ ok: true, status: 200, row: { bot_id: 'b1' } })),
  requireBotOwnership: vi.fn(async () => ({ ok: true, status: 200, row: {} })),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-resource-user', () => ({
  authorizers: new Proxy(
    {},
    { get: () => () => (_req: Request, _res: Response, next: () => void) => next() },
  ),
}))

import router from '../handlers/conversations.js'

function sendHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/messages' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/messages not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({
    locals: { session: { userId: 'u1' } },
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation((table: unknown) =>
    Promise.resolve(
      table === 'bots'
        ? {
            id: 'b1',
            model: 'claude-opus-4-8',
            system_prompt: 'You are helpful',
            max_tokens: 1024,
            temperature: 0.7,
          }
        : null,
    ),
  )
  db.findMany.mockResolvedValue([])
  db.create.mockResolvedValue({ data: { id: 'm1' } })
  chat.mockReturnValue(
    (async function* () {
      yield { type: 'text', content: 'hi' }
      yield { type: 'done', usage: { inputTokens: 1, outputTokens: 2 } }
    })(),
  )
})

describe('chat uses the bot’s configured model', () => {
  it('passes bot.model (with the other params) to the AI chat call', async () => {
    const req = { params: { id: 'c1' }, body: { content: 'hello' } } as unknown as Request
    await sendHandler()(req, makeRes())
    expect(chat).toHaveBeenCalledTimes(1)
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-8', maxTokens: 1024, temperature: 0.7 }),
    )
  })
})

describe('chat honors the bot temperature (including 0)', () => {
  const withTemperature = (temperature: unknown) =>
    db.findById.mockImplementation((table: unknown) =>
      Promise.resolve(
        table === 'bots'
          ? {
              id: 'b1',
              model: 'claude-opus-4-8',
              system_prompt: 'x',
              max_tokens: 1024,
              temperature,
            }
          : null,
      ),
    )
  const run = async () => {
    const req = { params: { id: 'c1' }, body: { content: 'hello' } } as unknown as Request
    await sendHandler()(req, makeRes())
    return (chat.mock.calls[0]?.[0] as { temperature?: number } | undefined)?.temperature
  }

  it('honors a stored temperature of 0 (deterministic "Precision"), not 0.7', async () => {
    withTemperature(0)
    expect(await run()).toBe(0)
  })

  it('honors a stringified numeric temperature "0.0000" (pg numeric) as 0', async () => {
    withTemperature('0.0000')
    expect(await run()).toBe(0)
  })

  it('falls back to 0.7 when temperature is unset/invalid', async () => {
    withTemperature(null)
    expect(await run()).toBe(0.7)
  })
})
