import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('/signup', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByPlaceholder(/email/i).first()
    await tb.fill('me@example.com')
    await expect(tb).toHaveValue('me@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByPlaceholder(/password/i).first()
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('back button routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('button', { name: /go back|back|sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('signup creates an account, POSTs /api/users, and lands the user on /overview', async ({
    page,
  }) => {
    const email = uniqueEmail('su')
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    await page.getByPlaceholder(/email/i).first().fill(email)
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill('TestPass123!')
    const nameField = page.getByPlaceholder(/your name/i)
    if (await nameField.count().catch(() => 0)) await nameField.fill('Smart Home Tester')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^sign up$/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/overview/, { timeout: 15_000 })
    })
    expect(whereUrl(reqs, /\/api\/users(?:\?|$|\b)/, 'POST').length).toBeGreaterThan(0)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
