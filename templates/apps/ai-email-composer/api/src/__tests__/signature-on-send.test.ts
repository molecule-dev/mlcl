import type { Request, Response } from 'express'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The user's signature (Settings → Preferences) was previewed but never sent. The composer now
// passes it to POST /drafts/:id/send, which appends it to the outgoing message body.

const sendMail = vi.fn(async (..._a: unknown[]) => ({
  accepted: ['x@y.test'],
  rejected: [],
  messageId: 'msg-1',
}))
const db = {
  findById: vi.fn(),
  updateById: vi.fn(async (..._a: unknown[]) => ({ data: {} })),
  create: vi.fn(async (..._a: unknown[]) => ({ data: { id: 's1' } })),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  count: vi.fn(async (..._a: unknown[]) => 0),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-emails', () => ({ sendMail: (...a: unknown[]) => sendMail(...a) }))
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  count: (...a: unknown[]) => db.count(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-ai', () => ({ requireProvider: () => ({ name: 'mock' }) }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? 'd1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/drafts.js'

function sendHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/send' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/send not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = (): Response =>
  ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const sentText = (): string => (sendMail.mock.calls[0]?.[0] as { text?: string })?.text ?? ''

const OLD_KEY = process.env.MAILGUN_API_KEY
beforeEach(() => {
  vi.clearAllMocks()
  process.env.MAILGUN_API_KEY = 'test-key'
  db.findById.mockResolvedValue({
    id: 'd1',
    user_id: 'u1',
    subject: 'Hi',
    body: 'The email body.',
    recipients: ['to@example.com'],
  })
})
afterAll(() => {
  if (OLD_KEY === undefined) delete process.env.MAILGUN_API_KEY
  else process.env.MAILGUN_API_KEY = OLD_KEY
})

describe('POST /drafts/:id/send appends the signature', () => {
  it('appends the passed signature to the outgoing body', async () => {
    await sendHandler()(
      { params: { id: 'd1' }, body: { signature: 'Jane Doe\nAcme Inc.' } } as unknown as Request,
      makeRes(),
    )
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sentText()).toBe('The email body.\n\nJane Doe\nAcme Inc.')
  })

  it('sends the body unchanged when no signature is provided', async () => {
    await sendHandler()({ params: { id: 'd1' }, body: {} } as unknown as Request, makeRes())
    expect(sentText()).toBe('The email body.')
  })
})
