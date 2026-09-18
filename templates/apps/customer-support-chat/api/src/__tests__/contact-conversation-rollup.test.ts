import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// contacts.total_conversations (the Contacts list "Conversations" column + the ContactDetail KPI)
// was hardcoded 0 and never incremented. Creating a conversation for a contact's visitor_email must
// roll up onto that contact — increment total_conversations and bump last_seen_at.

const db = {
  count: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
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
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@molecule/api-search', () => ({
  index: vi.fn().mockResolvedValue(undefined),
  search: vi.fn().mockResolvedValue([]),
}))

import router from '../handlers/conversations.js'

function postHandler(): (
  req: Request,
  res: Response,
  next: (e?: unknown) => void,
) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (
    req: Request,
    res: Response,
    next: (e?: unknown) => void,
  ) => Promise<void>
}
const makeRes = () => {
  const res = { locals: { session: { userId: 'u1' } }, statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response
}
const contactUpdate = () => db.updateById.mock.calls.find((c) => c[0] === 'contacts')
const run = (visitor_email: string | undefined, contact: Record<string, unknown> | null) => {
  db.findMany.mockResolvedValue(contact ? [contact] : [])
  const body = { subject: 'Need help', visitor_email }
  return postHandler()({ body } as unknown as Request, makeRes(), () => undefined)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'conv-1' } })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('conversation create rolls up onto the contact', () => {
  it("increments the matching contact's total_conversations and bumps last_seen_at", async () => {
    await run('alice@x.com', { id: 'contact-1', total_conversations: 2 })
    const call = contactUpdate()
    expect(call?.[1]).toBe('contact-1')
    expect((call?.[2] as { total_conversations: number }).total_conversations).toBe(3)
    expect((call?.[2] as { last_seen_at?: string }).last_seen_at).toBeTruthy()
  })

  it('does nothing when no contact matches the visitor email', async () => {
    await run('nobody@x.com', null)
    expect(contactUpdate()).toBeUndefined()
  })

  it('does nothing when the conversation has no visitor_email', async () => {
    await run(undefined, { id: 'contact-1', total_conversations: 2 })
    expect(db.findMany).not.toHaveBeenCalledWith('contacts', expect.anything())
    expect(contactUpdate()).toBeUndefined()
  })
})
