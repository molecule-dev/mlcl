import { describe, expect, it, vi } from 'vitest'

const findById = vi.fn()
vi.mock('@molecule/api-database', () => ({ findById: (...a: unknown[]) => findById(...a) }))

const { notificationAllowed, ownerWantsNotification } = await import('../lib/notify-prefs.js')

describe('notificationAllowed (opt-out semantics)', () => {
  it('is false ONLY when the key is explicitly false', () => {
    expect(
      notificationAllowed({ notificationPreferences: { contractSent: false } }, 'contractSent'),
    ).toBe(false)
    expect(
      notificationAllowed({ notificationPreferences: { contractSent: true } }, 'contractSent'),
    ).toBe(true)
  })

  it('defaults to true when the prefs blob, key, or oauthData is missing', () => {
    expect(notificationAllowed({ notificationPreferences: {} }, 'contractSigned')).toBe(true)
    expect(notificationAllowed({}, 'contractSigned')).toBe(true)
    expect(notificationAllowed(null, 'contractSigned')).toBe(true)
    expect(notificationAllowed(undefined, 'contractSigned')).toBe(true)
  })

  it('one key set to false does not suppress a different key', () => {
    expect(
      notificationAllowed({ notificationPreferences: { contractSent: false } }, 'contractSigned'),
    ).toBe(true)
  })
})

describe('ownerWantsNotification', () => {
  it('returns true for a missing owner id without hitting the db', async () => {
    findById.mockClear()
    expect(await ownerWantsNotification(null, 'contractSent')).toBe(true)
    expect(findById).not.toHaveBeenCalled()
  })

  it('loads the owner and applies the stored preference', async () => {
    findById.mockResolvedValueOnce({
      oauthData: { notificationPreferences: { contractSent: false } },
    })
    expect(await ownerWantsNotification('owner-1', 'contractSent')).toBe(false)
    findById.mockResolvedValueOnce({ oauthData: {} })
    expect(await ownerWantsNotification('owner-1', 'contractSent')).toBe(true)
  })

  it('defaults to true when the user row cannot be loaded', async () => {
    findById.mockResolvedValueOnce(null)
    expect(await ownerWantsNotification('ghost', 'contractSigned')).toBe(true)
  })
})
