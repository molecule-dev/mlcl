import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, signup } from './_helpers.js'

test.describe('Settings', () => {
  test('profile loads + saves name and persists across reload', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-profile').click()
    await expect(page.getByTestId('settings-name')).toBeVisible({ timeout: 10000 })

    const newName = 'Renamed Tester ' + Date.now()
    await page.getByTestId('settings-name').fill(newName)
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('settings-saved-at')).toBeVisible({ timeout: 10000 })

    const api = await authedApi(request, session.accessToken!)
    const me = await api.get('/profile/me')
    expect(me.status()).toBe(200)
    const data = (await me.json()) as { user: { name: string } }
    expect(data.user.name).toBe(newName)

    await page.reload()
    await expect(page.getByTestId('settings-name')).toHaveValue(newName)
  })

  test('preferences toggle persists to backend', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-preferences').click()
    await page.getByTestId('pref-requireConfirmation').click()
    await page.getByTestId('settings-save-prefs').click()
    await page.waitForTimeout(1500)

    const api = await authedApi(request, session.accessToken!)
    const me = await api.get('/profile/me')
    const data = (await me.json()) as { user: { preferences: Record<string, boolean> } }
    expect(data.user.preferences.requireConfirmation).toBe(true)
  })

  test('password change works — login with new password succeeds', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-security').click()
    await page.getByTestId('security-current-pwd').fill(session.password)
    const newPassword = 'NewPass456!'
    await page.getByTestId('security-new-pwd').fill(newPassword)
    await page.getByTestId('security-change-pwd').click()
    await expect(page.getByTestId('security-saved-at')).toBeVisible({ timeout: 10000 })

    const login = await request.post(APP_BASE + '/api/users/log-in', {
      data: { email: session.email, password: newPassword },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(login.status(), 'login with new password').toBe(200)
  })

  test('plan name renders for free user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-plan')).toContainText(/free/i, { timeout: 10000 })
  })
})
