import { beforeEach, describe, expect, it, vi } from 'vitest'

// The Settings page stores 7 per-event notification toggles in
// users.oauthData.ap.notifyPrefs, but the bid + listing producers (in-app
// create('notifications') AND the server-side outbid email) used to fire
// unconditionally — so a user who muted a type still got notified. The shared
// notificationEnabled() gate now honors the toggle: notify unless it's false.

const findById = vi.fn()
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(...a),
}))

import { notificationEnabled } from '../handlers/_notify.js'

beforeEach(() => findById.mockReset())

describe('notificationEnabled honors stored notifyPrefs', () => {
  it('notifies when the type toggle is unset (default on)', async () => {
    findById.mockResolvedValue({ oauthData: { ap: { notifyPrefs: { won: true } } } })
    expect(await notificationEnabled('u1', 'outbid')).toBe(true)
  })

  it('suppresses when the type toggle is explicitly false', async () => {
    findById.mockResolvedValue({ oauthData: { ap: { notifyPrefs: { outbid: false } } } })
    expect(await notificationEnabled('u1', 'outbid')).toBe(false)
  })

  it('notifies when the toggle is true', async () => {
    findById.mockResolvedValue({ oauthData: { ap: { notifyPrefs: { outbid: true } } } })
    expect(await notificationEnabled('u1', 'outbid')).toBe(true)
  })

  it('parses oauthData delivered as a JSON string', async () => {
    findById.mockResolvedValue({
      oauthData: JSON.stringify({ ap: { notifyPrefs: { sold: false } } }),
    })
    expect(await notificationEnabled('u1', 'sold')).toBe(false)
  })

  it('defaults to notifying when the user, oauthData, or prefs are missing', async () => {
    findById.mockResolvedValue(null)
    expect(await notificationEnabled('u1', 'won')).toBe(true)
    findById.mockResolvedValue({ oauthData: null })
    expect(await notificationEnabled('u1', 'won')).toBe(true)
    findById.mockResolvedValue({ oauthData: { ap: {} } })
    expect(await notificationEnabled('u1', 'won')).toBe(true)
  })
})
