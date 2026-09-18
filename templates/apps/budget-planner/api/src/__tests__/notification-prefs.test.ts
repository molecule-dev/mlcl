import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The per-type alert toggles (notifyBudgetOverspent / notifyGoalMilestones) are stored via Settings
// (users.oauthData.preferences), but deriveNotifications emitted every alert unconditionally — so
// turning a toggle off did nothing. The engine now reads the prefs and suppresses the matching type.

const db = { findMany: vi.fn(), findById: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

import router from '../handlers/notifications.js'

function getHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / not found')
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

// An overspent category (spent 100 > assigned 50) + a completed goal, so both alert types would fire
// unless a preference suppresses them.
function setup(prefs: Record<string, unknown> | undefined) {
  db.findById.mockImplementation(async (table: string) =>
    table === 'users' ? { id: 'u1', oauthData: prefs ? { preferences: prefs } : {} } : null,
  )
  db.findMany.mockImplementation(async (table: string) => {
    if (table === 'budget_categories') return [{ id: 'c1', name: 'Food', user_id: 'u1' }]
    if (table === 'budget_transactions')
      return [{ category_id: 'c1', amount: -100, date: new Date().toISOString() }]
    if (table === 'envelopes') return [{ category_id: 'c1', assigned: 50 }]
    if (table === 'goals')
      return [{ id: 'g1', name: 'Trip', target_amount: 100, saved_amount: 100 }]
    return []
  })
  db.updateById.mockResolvedValue({ data: {} })
}
const types = async (): Promise<string[]> => {
  const res = makeRes()
  await getHandler()({} as Request, res as unknown as Response)
  return (res.body as Array<{ type: string }>).map((n) => n.type)
}

beforeEach(() => vi.clearAllMocks())

describe('notification engine honors per-type alert preferences', () => {
  it('emits both alert types when preferences are unset (defaults on)', async () => {
    setup(undefined)
    const t = await types()
    expect(t).toContain('budget_overspent')
    expect(t).toContain('goal_reached')
  })

  it('suppresses budget_overspent when notifyBudgetOverspent=false (goals still fire)', async () => {
    setup({ notifyBudgetOverspent: false })
    const t = await types()
    expect(t).not.toContain('budget_overspent')
    expect(t).toContain('goal_reached')
  })

  it('suppresses goal alerts when notifyGoalMilestones=false (overspent still fires)', async () => {
    setup({ notifyGoalMilestones: false })
    const t = await types()
    expect(t).not.toContain('goal_reached')
    expect(t).toContain('budget_overspent')
  })
})
