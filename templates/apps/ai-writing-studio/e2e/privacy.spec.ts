/**
 * /privacy — static legal page.
 *
 * Real outcome: page renders with all three sections and the intro
 * paragraph mentions the app. No app-API calls.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/privacy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
  })

  test('static legal page makes no app-API calls', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
      await expect(page.getByRole('heading', { name: /^Privacy Policy$/i, level: 1 })).toBeVisible()
    })
    const apiHits = reqs.filter((r) => r.url.includes('/api/'))
    expect(apiHits, 'static legal page must not hit /api/*').toEqual([])
  })

  test('Privacy Policy h1 renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Privacy Policy$/i, level: 1 })).toBeVisible()
  })

  test('Data we store h2 renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Data we store/i, level: 2 })).toBeVisible()
  })

  test('Your rights h2 renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Your rights/i, level: 2 })).toBeVisible()
  })

  test('intro paragraph mentions data collection', async ({ page }) => {
    await expect(page.getByText(/We collect|the data needed/i).first()).toBeVisible()
  })
})
