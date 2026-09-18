import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Inviting an EXISTING user to a workspace adds them as a member — it must also surface an
// in-app notification in the invitee's bell (which was otherwise never populated). Recipient
// is the invitee, never the admin; external (no-account) emails get only the email invite.

const db = {
  create: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({ messageId: 'x' }) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
}))
const requireWorkspaceAdmin = vi.fn()
vi.mock('../lib/authz.js', () => ({
  requireWorkspaceAdmin: (...a: unknown[]) => requireWorkspaceAdmin(...a),
  requireWorkspaceMember: vi.fn(),
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
function makeRes() {
  const res = {
    statusCode: 200,
    locals: { session: { userId: 'admin-1' } },
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
  }
  return res
}
const run = (inviteeId: string | null, res: ReturnType<typeof makeRes>) => {
  db.findMany.mockResolvedValue(inviteeId ? [{ id: inviteeId }] : [])
  return inviteHandler()(
    { body: { workspace_id: 'w1', email: 'x@y.com', role: 'member' } } as unknown as Request,
    res as unknown as Response,
  )
}
const notif = () =>
  db.create.mock.calls.find((c) => c[0] === 'notifications')?.[1] as
    { user_id?: string; type?: string } | undefined

beforeEach(() => {
  vi.clearAllMocks()
  requireWorkspaceAdmin.mockResolvedValue({ ok: true, row: { name: 'Eng' } })
  db.create.mockResolvedValue({ data: {} })
})

describe('workspace invite notification', () => {
  it('notifies an existing invitee added to the workspace', async () => {
    const res = makeRes()
    await run('invitee-1', res)
    expect(res.statusCode).toBe(201)
    expect(notif()?.user_id).toBe('invitee-1')
    expect(notif()?.type).toBe('workspace_invite')
  })

  it('does not self-notify when the admin invites themselves', async () => {
    const res = makeRes()
    await run('admin-1', res)
    expect(res.statusCode).toBe(201)
    expect(db.create.mock.calls.some((c) => c[0] === 'notifications')).toBe(false)
  })

  it('sends no in-app notification for an external (no-account) email', async () => {
    const res = makeRes()
    await run(null, res)
    expect(res.statusCode).toBe(201)
    expect(db.create.mock.calls.some((c) => c[0] === 'notifications')).toBe(false)
  })
})

describe('workspace seat limit (workspaces.seat_limit)', () => {
  // table-aware findMany: the users lookup finds the invitee; workspace_members returns current members.
  const invite = (res: ReturnType<typeof makeRes>, inviteeId: string, memberUserIds: string[]) => {
    db.findMany.mockImplementation((table: string) =>
      Promise.resolve(
        table === 'users' ? [{ id: inviteeId }] : memberUserIds.map((u) => ({ user_id: u })),
      ),
    )
    return inviteHandler()(
      { body: { workspace_id: 'w1', email: 'x@y.com', role: 'member' } } as unknown as Request,
      res as unknown as Response,
    )
  }

  it('403s when the workspace is already at its seat_limit and adds no member', async () => {
    requireWorkspaceAdmin.mockResolvedValue({ ok: true, row: { seat_limit: 2 } })
    const res = makeRes()
    await invite(res, 'new-user', ['owner', 'member-a']) // 2 members, limit 2 → full
    expect(res.statusCode).toBe(403)
    expect(db.create.mock.calls.some((c) => c[0] === 'workspace_members')).toBe(false)
  })

  it('adds the member when under the seat_limit', async () => {
    requireWorkspaceAdmin.mockResolvedValue({ ok: true, row: { seat_limit: 5 } })
    const res = makeRes()
    await invite(res, 'new-user', ['owner', 'member-a']) // 2 of 5 → room
    expect(res.statusCode).toBe(201)
    expect(db.create.mock.calls.some((c) => c[0] === 'workspace_members')).toBe(true)
  })

  it('does not block re-inviting an existing member even when full', async () => {
    requireWorkspaceAdmin.mockResolvedValue({ ok: true, row: { seat_limit: 1 } })
    const res = makeRes()
    await invite(res, 'existing', ['existing']) // already a member → no new seat consumed
    expect(res.statusCode).not.toBe(403)
  })
})
