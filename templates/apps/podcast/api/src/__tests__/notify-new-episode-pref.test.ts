import { beforeEach, describe, expect, it, vi } from 'vitest'

// The publish flow notified every subscriber of a show unconditionally, ignoring each listener's
// stored `notifyNewEpisode` preference (Settings → "New episodes from subscribed shows"). It now
// loads each subscriber's user_preferences and skips those who opted out.

const db = {
  findMany: vi.fn(),
  create: vi.fn(async (..._a: unknown[]) => ({})),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
}))

const { shouldNotifyNewEpisode, notifyNewEpisodeSubscribers } =
  await import('../lib/notify-subscribers.js')

beforeEach(() => vi.clearAllMocks())

describe('shouldNotifyNewEpisode', () => {
  it('defaults to notify when the preference is unset', () => {
    expect(shouldNotifyNewEpisode(undefined)).toBe(true)
    expect(shouldNotifyNewEpisode(null)).toBe(true)
    expect(shouldNotifyNewEpisode({})).toBe(true)
    expect(shouldNotifyNewEpisode({ notifyNewEpisode: true })).toBe(true)
  })

  it('skips only when explicitly disabled', () => {
    expect(shouldNotifyNewEpisode({ notifyNewEpisode: false })).toBe(false)
  })
})

describe('notifyNewEpisodeSubscribers', () => {
  it('notifies opted-in subscribers and skips opted-out ones', async () => {
    // subscriptions lookup, then one user_preferences lookup per subscriber.
    db.findMany
      .mockResolvedValueOnce([{ user_id: 'in' }, { user_id: 'out' }, { user_id: 'default' }]) // subs
      .mockResolvedValueOnce([{ preferences: { notifyNewEpisode: true } }]) // 'in'
      .mockResolvedValueOnce([{ preferences: { notifyNewEpisode: false } }]) // 'out'
      .mockResolvedValueOnce([]) // 'default' — no prefs row

    await notifyNewEpisodeSubscribers({ showId: 's1', episodeId: 'e1', title: 'Ep 1' })

    const notified = db.create.mock.calls
      .filter((c) => c[0] === 'notifications')
      .map((c) => (c[1] as { user_id: string }).user_id)
    expect(notified).toEqual(['in', 'default'])
    expect(notified).not.toContain('out')
  })

  it('creates no notifications when there are no subscribers', async () => {
    db.findMany.mockResolvedValueOnce([])
    await notifyNewEpisodeSubscribers({ showId: 's1', episodeId: 'e1', title: 'Ep 1' })
    expect(db.create).not.toHaveBeenCalled()
  })
})
