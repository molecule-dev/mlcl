import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/privacy', () => {
  test('renders without throwing', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
    })
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 })
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('has body copy / static prose', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const text = await page.evaluate(() => document.body.textContent || '')
    expect(text.length).toBeGreaterThan(50)
  })

  test('back-to-home link points at /', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const homeLinks = page.locator('a[href="/"]')
    await expect(homeLinks.first()).toBeAttached()
  })
})
