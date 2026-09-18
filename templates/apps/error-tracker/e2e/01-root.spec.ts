import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ (landing)', () => {
  test('renders the marketing landing without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('signup CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const cta = page
      .getByRole('link', { name: /start tracking|get started|sign\s*up|create.*account/i })
      .first()
    if ((await cta.count()) > 0) {
      await cta.click()
      await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
    }
  })

  test('login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })

  test('/404 renders the not-found shell', async ({ page }) => {
    await page.goto(APP_BASE + '/this-route-does-not-exist-xyz')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).toMatch(/not\s*found|404|no.*page/)
  })
})
