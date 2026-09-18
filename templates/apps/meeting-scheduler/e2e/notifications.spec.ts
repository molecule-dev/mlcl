import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, signup } from './_helpers.js'

test.describe('Notifications', () => {
  test('empty state shows when no bookings exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-empty')).toBeVisible({ timeout: 10000 })
  })

  test('toggling a channel persists to backend preferences', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-channel-emailReminders')).toBeVisible({
      timeout: 10000,
    })
    await page.getByTestId('notifications-channel-emailReminders').click()
    await page.waitForTimeout(1500)

    const api = await authedApi(request, session.accessToken!)
    const me = await api.get('/profile/me')
    const data = (await me.json()) as { user: { preferences: Record<string, unknown> } }
    expect(typeof data.user.preferences.emailReminders).toBe('boolean')
  })

  test('Notifications page renders heading + reminder presets section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('notifications-reminder-15-min')).toBeVisible({ timeout: 10000 })
  })
})
