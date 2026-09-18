import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/', () => {
  test('landing fetches /api/storefront and renders headline', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/storefront/.test(r.url))).toBeTruthy()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Sell on Vendry navigates to /vendor/apply', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sell on Vendry/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/vendor\/apply/)
  })

  test('Shop the marketplace navigates to /catalog', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Shop the marketplace/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/catalog/)
  })

  test('Sign in navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
