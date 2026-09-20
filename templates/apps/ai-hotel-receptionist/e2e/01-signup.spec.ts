import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/signup', () => {
  test('renders the split brand panel with sample greetings', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('button', { name: /Create account/i }).first()).toBeVisible({
      timeout: 15000,
    })
    // The brand panel lists greetings in several agent languages (lg+ only).
    await expect(page.getByText(/日本語/)).toBeVisible()
  })

  test('password mismatch is flagged inline', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    // Fill every required field — native validation would otherwise block
    // submit before the mismatch check ever runs.
    await page.getByLabel(/First name/i).fill('Mismatch')
    await page.getByLabel(/Last name/i).fill('Tester')
    await page.getByLabel(/Email/i).fill('mismatch.tester@example.com')
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('DifferentPass99!')
    await page
      .getByRole('button', { name: /Create account/i })
      .first()
      .click()
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible({ timeout: 10000 })
  })

  test('creating an account lands on the dashboard', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 })
    await expect(page.getByRole('heading', { name: /Today at the front desk/i })).toBeVisible({
      timeout: 15000,
    })
  })
})
