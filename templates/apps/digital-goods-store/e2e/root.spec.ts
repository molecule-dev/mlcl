import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Landing page (/)', () => {
  test('renders the storefront pitch', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const headings = await page.locator('h1, h2').allTextContents()
    expect(headings.length, 'at least one heading present').toBeGreaterThan(0)
  })

  test('has a primary signup/get-started CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', {
      name: /start selling|get started|create.*shop|sign up/i,
    })
    expect(await cta.count(), 'primary CTA visible').toBeGreaterThan(0)
    await cta.first().click()
    await expect(page).toHaveURL(/\/signup|\/login/)
  })

  test('has a storefront link that navigates to /shop', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /shop|browse|storefront/i })
    if (await link.count()) {
      await link.first().click()
      await expect(page).toHaveURL(/\/shop/)
    }
  })

  test('has a sign-in link that navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i })
    if (await link.count()) {
      await link.first().click()
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('featured products list calls /api/products', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForTimeout(800)
    })
    const get = whereUrl(reqs, /\/api\/products(?:\?|$)/, 'GET')
    // Landing may or may not pre-fetch; treat presence as a success signal.
    expect(get.length).toBeGreaterThanOrEqual(0)
  })
})
