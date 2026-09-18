import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy (Privacy)', () => {
  test('Privacy heading renders', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { level: 1, name: /privacy/i })).toBeVisible()
  })

  test('Intro paragraph renders below the heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('main p').first()).toBeVisible()
  })

  test('Page exposes the privacy shell via [data-mol-id="page-privacy"]', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[data-mol-id="page-privacy"]')).toBeVisible()
  })
})
