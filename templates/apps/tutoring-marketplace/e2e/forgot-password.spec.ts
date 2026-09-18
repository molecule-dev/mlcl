/**
 * /forgot-password per-page suite.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, BRAND, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders email input + Send reset link button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link|reset/i }).first()).toBeVisible()
  })

  test('Back to sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })

  test('submitting fires POST /api/users/forgot-password and returns 2xx', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot-page'))
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(2_500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'POST /api/users/forgot-password fired').toBeDefined()
    expect(post?.status).toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(400)
  })

  test('forgot-password is non-revealing for unknown emails (still 2xx)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').first().fill(`nobody-${Date.now()}@example.com`)
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(2_500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post?.status).toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(400)
  })

  test('Brand logo link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: new RegExp(`^${BRAND}$`, 'i') })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })
})
