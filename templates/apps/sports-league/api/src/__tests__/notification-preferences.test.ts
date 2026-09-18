import { beforeEach, describe, expect, it, vi } from 'vitest'

// Fan-out of score notifications must honor each fan's stored notification preference
// (users.oauthData.sl.notifications.score_alerts, default on). It used to notify + push every
// fan who favorited a team unconditionally, so turning "Score alerts" off in Settings did nothing.

const db = { create: vi.fn(), findById: vi.fn(), findMany: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
const push = { hasProvider: vi.fn(() => true), send: vi.fn() }
vi.mock('@molecule/api-push-notifications', () => ({
  hasProvider: () => push.hasProvider(),
  send: (...a: unknown[]) => push.send(...a),
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(), hasProvider: vi.fn(() => false) }))
vi.mock('../middleware/require-admin.js', () => ({
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('./_seed.js', () => ({ seedDemoOnce: vi.fn() }))

import { fanoutPushToFavorites } from '../handlers/scores.js'

const notifiedUserIds = () =>
  db.create.mock.calls
    .filter((c) => c[0] === 'notifications')
    .map((c) => (c[1] as { user_id: string }).user_id)

/** favorite_teams returns the given fans; users returns each fan's score_alerts pref. */
function seedFans(prefs: Record<string, boolean | undefined | 'no-oauth'>) {
  db.findMany.mockImplementation((table: string) =>
    Promise.resolve(
      table === 'favorite_teams' ? Object.keys(prefs).map((user_id) => ({ user_id })) : [],
    ),
  )
  db.findById.mockImplementation((table: string, id: string) => {
    if (table !== 'users') return Promise.resolve(null)
    const p = prefs[id]
    if (p === 'no-oauth') return Promise.resolve({ oauthData: null })
    if (p === undefined) return Promise.resolve({ oauthData: { sl: {} } })
    return Promise.resolve({ oauthData: { sl: { notifications: { score_alerts: p } } } })
  })
}
const run = () => fanoutPushToFavorites(['team-1'], { title: 'Final', body: 'ATL 3 — CHI 1' })

beforeEach(() => {
  vi.clearAllMocks()
  push.hasProvider.mockReturnValue(true)
  db.create.mockResolvedValue({ data: { id: 'n1' } })
})

describe('score-alert fan-out honors notification preferences', () => {
  it('notifies opted-in fans and skips opted-out fans', async () => {
    seedFans({ 'fan-on': true, 'fan-off': false })
    await run()
    expect(notifiedUserIds()).toEqual(['fan-on'])
  })

  it('treats an unset preference as enabled (default on)', async () => {
    seedFans({ 'fan-unset': undefined, 'fan-no-oauth': 'no-oauth' })
    await run()
    expect(notifiedUserIds().sort()).toEqual(['fan-no-oauth', 'fan-unset'])
  })

  it('creates nothing for a fan who disabled score alerts', async () => {
    seedFans({ 'fan-off': false })
    await run()
    expect(db.create).not.toHaveBeenCalled()
    expect(push.send).not.toHaveBeenCalled()
  })
})
