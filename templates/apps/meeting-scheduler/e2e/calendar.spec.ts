import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('Calendar', () => {
  test('grid renders with no bookings — shows empty hint', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await expect(page.getByTestId('calendar-grid')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('calendar-empty')).toBeVisible()
  })

  test('Today button stays on /calendar', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await page.getByTestId('calendar-today').click()
    expect(page.url()).toContain('/calendar')
  })

  test('Calendar page heading renders for an authed host', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/calendar')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })
})
