import { beforeEach, describe, expect, it, vi } from 'vitest'

// The like/comment/follow fan-out created notifications unconditionally, so a recipient who muted a
// type (users.oauthData.socialPreferences) still got them. notificationEnabled now gates each — the
// recipient is notified unless the matching toggle is explicitly false.

const db = { findById: vi.fn() }
vi.mock('@molecule/api-database', () => ({ findById: (...a: unknown[]) => db.findById(...a) }))

import { notificationEnabled } from '../handlers/_notify.js'

const withPrefs = (prefs: Record<string, unknown> | undefined) =>
  db.findById.mockResolvedValue(
    prefs === undefined
      ? { id: 'u1', oauthData: null }
      : { id: 'u1', oauthData: { socialPreferences: prefs } },
  )

beforeEach(() => vi.clearAllMocks())

describe('notificationEnabled', () => {
  it('suppresses a type the recipient explicitly turned off', async () => {
    withPrefs({ notifLikes: false })
    expect(await notificationEnabled('u1', 'like')).toBe(false)
  })

  it('notifies when the toggle is on', async () => {
    withPrefs({ notifComments: true })
    expect(await notificationEnabled('u1', 'comment')).toBe(true)
  })

  it('defaults to on when the preference is unset (no behavior change for unconfigured users)', async () => {
    withPrefs({}) // socialPreferences present but empty
    expect(await notificationEnabled('u1', 'like')).toBe(true)
    withPrefs(undefined) // no oauthData at all
    expect(await notificationEnabled('u1', 'follow')).toBe(true)
  })

  it('maps each notification type to its preference key', async () => {
    withPrefs({ notifLikes: false, notifComments: true, notifFollows: false })
    expect(await notificationEnabled('u1', 'like')).toBe(false)
    expect(await notificationEnabled('u1', 'comment')).toBe(true)
    expect(await notificationEnabled('u1', 'follow')).toBe(false)
  })

  it('notifies for an unknown type without loading the user', async () => {
    expect(await notificationEnabled('u1', 'mention')).toBe(true)
    expect(db.findById).not.toHaveBeenCalled()
  })
})
