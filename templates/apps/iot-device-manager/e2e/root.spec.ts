import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ landing page', () => {
  test('Filament logo links back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('a[href="/"]').first().click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('Sign in link routes to /login', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.locator('a[href="/login"]').first().click()
      await page.waitForURL(/\/login/, { timeout: 5000 })
    })
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('Get a demo CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('a[href="/signup"]').first().click()
    await page.waitForURL(/\/signup/, { timeout: 5000 })
  })
})
