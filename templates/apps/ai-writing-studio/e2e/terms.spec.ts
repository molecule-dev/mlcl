/**
 * /terms — static legal page.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/terms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
  })

  test('static legal page makes no app-API calls', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await expect(page.getByRole('heading', { name: /Terms of Service/i, level: 1 })).toBeVisible()
    })
    const apiHits = reqs.filter((r) => r.url.includes('/api/'))
    expect(apiHits, 'static legal page must not hit /api/*').toEqual([])
  })

  test('Terms of Service h1 renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Terms of Service/i, level: 1 })).toBeVisible()
  })

  test('Your content h2 renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Your content/i, level: 2 })).toBeVisible()
  })

  test('Billing h2 renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Billing$/i, level: 2 })).toBeVisible()
  })

  test('intro paragraph mentions account and lawful use', async ({ page }) => {
    await expect(page.getByText(/By creating an account/i).first()).toBeVisible()
  })
})
