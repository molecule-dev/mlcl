import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password page', () => {
  test('renders all four fields prefilled from URL params', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc123&email=foo@example.com')
    await expect(page.locator('input[type="email"]').first()).toHaveValue('foo@example.com')
    await expect(page.locator('input[type="text"]').first()).toHaveValue('abc123')
    expect(await page.locator('input[type="password"]').count()).toBeGreaterThanOrEqual(2)
  })

  test('mismatched passwords show inline error and never POST to backend', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=tok&email=u@x.com')
    const pwds = page.locator('input[type="password"]')
    await pwds.nth(0).fill('Password1!')
    await pwds.nth(1).fill('Different1!')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(800)
    })
    // Mismatch is caught client-side — no /reset request fires.
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/reset-password/i.test(r.url),
    )
    expect(post, 'mismatch should not POST').toBeFalsy()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('"Back to sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=tok&email=u@x.com')
    await page.locator('a[href="/login"]').first().click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
