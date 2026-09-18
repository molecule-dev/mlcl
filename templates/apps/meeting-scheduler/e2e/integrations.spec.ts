import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, signup } from './_helpers.js'

test.describe('Integrations', () => {
  test('renders integration cards for the major providers', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/integrations')
    await expect(page.getByTestId('integration-google-calendar')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('integration-zoom')).toBeVisible()
    await expect(page.getByTestId('integration-stripe')).toBeVisible()
  })

  test('connecting an integration persists to preferences', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/integrations')
    await expect(page.getByTestId('integration-google-calendar-toggle')).toBeVisible({
      timeout: 10000,
    })
    await page.getByTestId('integration-google-calendar-toggle').click()
    await page.waitForTimeout(1500)

    const api = await authedApi(request, session.accessToken!)
    const me = await api.get('/profile/me')
    const data = (await me.json()) as {
      user: { preferences: { integrations?: Record<string, boolean> } }
    }
    expect(data.user.preferences.integrations?.['google-calendar']).toBe(true)

    await page.reload()
    await expect(page.getByTestId('integration-google-calendar-status')).toContainText(/connected/i)
  })

  test('integration toggles render in their disconnected default state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/integrations')
    await expect(page.getByTestId('integration-google-calendar-status')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByTestId('integration-zoom-status')).toBeVisible()
  })
})
