import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('static pages (logged-out)', () => {
  test('/ landing page loads with hero and CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/(?:landing)?$/)
    // CTAs to signup or pricing exist.
    const hasSignupLink =
      (await page.getByRole('link', { name: /sign\s*up|get\s*started/i }).count()) > 0
    const hasPricingLink = (await page.getByRole('link', { name: /pricing/i }).count()) > 0
    expect(hasSignupLink || hasPricingLink, 'landing must link to signup or pricing').toBe(true)
  })

  test('/privacy renders without crashing', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('body')).toContainText(/privacy/i)
  })

  test('/terms renders without crashing', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('body')).toContainText(/terms/i)
  })

  test('unknown route shows the NotFound page', async ({ page }) => {
    await page.goto(APP_BASE + '/this-route-does-not-exist-12345')
    await expect(page.getByText(/404|not found|missing/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('/signup form renders all required fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(
      page
        .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
        .first(),
    ).toBeVisible()
  })

  test('/login form renders all required fields', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  })

  test('/forgot-password renders an email input + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /send|reset|submit/i }).first()).toBeVisible()
  })
})
