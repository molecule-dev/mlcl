import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms (Terms)', () => {
  test('Terms heading renders', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { level: 1, name: /terms/i })).toBeVisible()
  })

  test('Intro paragraph renders below the heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('main p').first()).toBeVisible()
  })

  test('Page exposes the terms shell via [data-mol-id="page-terms"]', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('[data-mol-id="page-terms"]')).toBeVisible()
  })
})
