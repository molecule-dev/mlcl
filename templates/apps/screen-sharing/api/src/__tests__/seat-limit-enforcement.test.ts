import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A workspace's seat_limit was stored but never checked: POST /members/invite created a member row
// unconditionally, so an admin could invite past the seat cap. Invite now counts current members
// and rejects (403) when the workspace is full — but still allows re-inviting an existing member.

const authz = vi.hoisted(() => ({
  requireWorkspaceAdmin: vi.fn(),
  requireWorkspaceMember: vi.fn(),
}))
vi.mock('../lib/authz.js', () => authz)

const db = {
  count: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => ({ messageId: 'x' })) }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import router from '../handlers/workspace-members.js'

function inviteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/invite' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /invite not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = {
    locals: { session: { userId: 'admin-1' } },
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res as unknown as Response & { statusCode: number }
}
const memberCreated = () => db.create.mock.calls.some((c) => c[0] === 'workspace_members')
type Where = Array<{ field: string }>
const run = (seat_limit: number, memberCount: number, alreadyMemberCount: number) => {
  authz.requireWorkspaceAdmin.mockResolvedValue({
    ok: true,
    status: 200,
    row: { name: 'WS', seat_limit },
  })
  db.findMany.mockResolvedValue([{ id: 'invitee-1' }])
  db.count.mockImplementation((_t: unknown, where?: Where) =>
    Promise.resolve(where?.some((c) => c.field === 'user_id') ? alreadyMemberCount : memberCount),
  )
  db.create.mockResolvedValue({ data: { id: 'wm-1' } })
  const req = { body: { workspace_id: 'w1', email: 'a@b.com' }, params: {} } as unknown as Request
  const res = makeRes()
  return inviteHandler()(req, res).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('workspace invite enforces seat_limit', () => {
  it('403s a new member when the workspace is at its seat limit', async () => {
    const res = await run(2, 2, 0)
    expect(res.statusCode).toBe(403)
    expect(memberCreated()).toBe(false)
  })

  it('admits a new member while a seat remains', async () => {
    const res = await run(2, 1, 0)
    expect(res.statusCode).toBe(201)
    expect(memberCreated()).toBe(true)
  })

  it('allows re-inviting someone already in the workspace even when full', async () => {
    const res = await run(2, 2, 1) // full, but the invitee is already a member
    expect(res.statusCode).toBe(201)
    expect(memberCreated()).toBe(true)
  })
})
