import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// contacts.is_blocked had a purpose-built helper (isContactBlocked) that no code path called, so a
// blocked user could still send messages freely. Sending into a 1:1 direct conversation now rejects
// (403) when a block exists in either direction; groups (3+ participants) are exempt.

const authz = vi.hoisted(() => ({
  requireConversationParticipant: vi.fn(async () => ({ ok: true, status: 200, row: {} })),
  isContactBlocked: vi.fn(async () => false),
}))
vi.mock('../lib/authz.js', () => authz)

const db = {
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  count: vi.fn(async (..._a: unknown[]) => 0),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-encryption', () => ({
  encrypt: async (x: string) => x,
  decrypt: async (x: string) => x,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => undefined) }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_decorate.js', () => ({ decorateMessages: vi.fn(async (m: unknown) => m) }))

import router from '../handlers/messages.js'

function sendHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { locals: { session: { userId: 'me' } }, statusCode: 200, body: undefined as unknown }
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
const direct = [
  { id: 'p1', user_id: 'me', unread_count: 0 },
  { id: 'p2', user_id: 'other', unread_count: 0 },
]
const group = [...direct, { id: 'p3', user_id: 'third', unread_count: 0 }]
const run = (participants: unknown[], blocked: boolean) => {
  authz.isContactBlocked.mockResolvedValue(blocked)
  db.findMany.mockResolvedValue(participants)
  db.create.mockResolvedValue({ data: { id: 'm1', conversation_id: 'c1' } })
  db.updateById.mockResolvedValue({ data: {} })
  const res = makeRes()
  const req = { body: { conversation_id: 'c1', content: 'hi' } } as unknown as Request
  return sendHandler()(req, res).then(() => res as unknown as { statusCode: number })
}

beforeEach(() => {
  vi.clearAllMocks()
  authz.requireConversationParticipant.mockResolvedValue({ ok: true, status: 200, row: {} })
})

describe('message send enforces contact blocks (1:1 only)', () => {
  it('403s and creates nothing when the other party is blocked', async () => {
    const res = await run(direct, true)
    expect(res.statusCode).toBe(403)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('sends normally in a direct conversation with no block', async () => {
    const res = await run(direct, false)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith('messages', expect.objectContaining({ sender_id: 'me' }))
  })

  it('does not apply the block check to group conversations (3+ participants)', async () => {
    const res = await run(group, true) // blocked would be true, but a group is exempt
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
    expect(authz.isContactBlocked).not.toHaveBeenCalled()
  })
})
