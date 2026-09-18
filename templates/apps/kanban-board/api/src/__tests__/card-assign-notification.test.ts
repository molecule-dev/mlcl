import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Assigning a card to a board member must create an in-app notification for them — the
// notifications table/feed/bell exist but nothing ever created a row. Self-assignment (the
// owner assigning to themselves) must NOT notify.

const OWNER = '11111111-1111-4111-8111-111111111111'
const CARD = '22222222-2222-4222-8222-222222222222'
const OLD_ASSIGNEE = '33333333-3333-4333-8333-333333333333'
const NEW_ASSIGNEE = '44444444-4444-4444-8444-444444444444'

let currentUser = OWNER
vi.mock('@molecule/api-bonds-default-express', () => ({ requireUser: () => currentUser }))

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => undefined) }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import router from '../handlers/cards.js'

function patchHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.patch)
  if (!layer?.route) throw new Error('PATCH /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
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
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = OWNER
  db.findOne.mockResolvedValue({
    id: CARD,
    owner_id: OWNER,
    assignee_id: OLD_ASSIGNEE,
    board_id: 'b1',
    title: 'Ship the thing',
  })
  db.updateById.mockResolvedValue({ data: { id: CARD, title: 'Ship the thing', board_id: 'b1' } })
  db.create.mockResolvedValue({ data: {} })
})

describe('kanban-board card assignment → notification', () => {
  it('notifies the newly-assigned member', async () => {
    const res = makeRes()
    await patchHandler()(
      { params: { id: CARD }, body: { assignee_id: NEW_ASSIGNEE } } as unknown as Request,
      res as unknown as Response,
    )
    const notif = (db.create.mock.calls as unknown[][]).find((c) => c[0] === 'notifications')
    expect(notif).toBeDefined()
    expect(notif?.[1]).toMatchObject({ user_id: NEW_ASSIGNEE, type: 'card_assigned' })
  })

  it('does NOT notify on self-assignment', async () => {
    const res = makeRes()
    await patchHandler()(
      { params: { id: CARD }, body: { assignee_id: OWNER } } as unknown as Request,
      res as unknown as Response,
    )
    expect((db.create.mock.calls as unknown[][]).some((c) => c[0] === 'notifications')).toBe(false)
  })
})
