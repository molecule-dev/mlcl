import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/terms page', () => {
  test('renders an h1', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('logo / home link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const home = page.locator('a[href="/"]').first()
    if (await home.count()) {
      await home.click()
      await page.waitForURL((url) => url.pathname === '/', { timeout: 5000 })
    }
  })

  test('captures app shell load with no console errors', async ({ page }) => {
    await captureNetwork(page, async () => {
      await expectNoConsoleErrors(page, async () => {
        await page.goto(APP_BASE + '/terms')
        await page.waitForLoadState('networkidle')
      })
    })
  })
})
