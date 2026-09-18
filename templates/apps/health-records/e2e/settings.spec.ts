/**
 * Settings — outcome assertions for change-password + encryption-key
 * rotation. Both of these were placebo before the dispatch:
 *
 *  - "Change password" called an undefined function and silently failed.
 *  - "Rotate now" only stamped a date on the user's profile and changed
 *    nothing else; an attacker with the old key would still be the same key.
 *
 * These tests assert the new wiring:
 *
 *  - POST /users/password rejects the wrong current password (401).
 *  - POST /users/password with the correct current password succeeds (2xx)
 *    and the user can log in with the new password.
 *  - POST /api/profile/me/rotate-key bumps `encryptionKeyVersion` and
 *    changes `encryptionKeyFingerprint` on the profile bundle.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, login, signup, uniqueEmail } from './_helpers.js'

interface ProfileBundle {
  security: {
    encryptionKeyVersion?: number
    encryptionKeyFingerprint?: string
    lastEncryptionKeyRotation?: string
  }
}

test.describe('settings', () => {
  test('change-password rejects the wrong old password and accepts the right one', async ({
    page,
  }) => {
    const email = uniqueEmail('pw-change')
    const oldPassword = 'OldPass123!'
    const newPassword = 'NewPass456!'
    const { accessToken } = await signup(page, email, oldPassword)

    // Wrong current password → 4xx. The canonical route mounted by
    // mountDefaultUserSecurityRoutes is `PATCH /users/:id/password`
    // (authSelf rewrites `:id === 'me'` to the session userId). The
    // handler expects `currentPassword` + `newPassword`.
    const wrong = await page.request.patch(`${API_BASE}/users/me/password`, {
      headers: authHeaders(accessToken),
      data: { currentPassword: 'NopeNope!1', newPassword },
    })
    expect(wrong.status()).toBeGreaterThanOrEqual(400)

    // Right current password → 2xx and we can log in with the new one.
    const ok = await page.request.patch(`${API_BASE}/users/me/password`, {
      headers: authHeaders(accessToken),
      data: { currentPassword: oldPassword, newPassword },
    })
    expect(ok.status(), await ok.text().catch(() => '')).toBeLessThan(400)

    // Verify by logging in with the new password from a fresh page state.
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, newPassword)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('rotate-key bumps encryptionKeyVersion and changes encryptionKeyFingerprint', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('rotate'))
    const before = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    expect(before.status(), await before.text().catch(() => '')).toBeLessThan(400)
    const beforeBundle = (await before.json()) as ProfileBundle
    const beforeVersion = beforeBundle.security?.encryptionKeyVersion ?? 0
    const beforeFingerprint = beforeBundle.security?.encryptionKeyFingerprint ?? null

    const rotate = await page.request.post(`${API_BASE}/profile/me/rotate-key`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(rotate.status(), await rotate.text().catch(() => '')).toBeLessThan(400)
    const afterBundle = (await rotate.json()) as ProfileBundle
    expect(afterBundle.security?.encryptionKeyVersion ?? 0).toBeGreaterThan(beforeVersion)
    expect(afterBundle.security?.encryptionKeyFingerprint).toBeTruthy()
    expect(afterBundle.security?.encryptionKeyFingerprint).not.toBe(beforeFingerprint)
    expect(afterBundle.security?.lastEncryptionKeyRotation).toBeTruthy()
  })

  test('settings page renders the security section with the current key version', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-page'))
    // Force at least one rotation so the version + fingerprint are populated.
    await page.request.post(`${API_BASE}/profile/me/rotate-key`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/v\d+/) // version label e.g. "v1 · abcd1234… · last rotated …"
    expect(body.toLowerCase()).toContain('rotate')
  })
})
