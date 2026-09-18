/**
 * /signup — Herald workspace signup form.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders the signup form with all fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[autocomplete="given-name"]').first()).toBeVisible()
    await expect(page.locator('input[autocomplete="family-name"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[autocomplete="new-password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create.*workspace|create.*account/i }).first(),
    ).toBeVisible()
  })

  test('blocks submission when passwords do not match', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="given-name"]').fill('Alex')
    await page.locator('input[autocomplete="family-name"]').fill('Tester')
    await page.locator('input[type="email"]').fill(uniqueEmail('mismatch'))
    await page.locator('input[autocomplete="new-password"]').nth(0).fill('Password1!')
    await page.locator('input[autocomplete="new-password"]').nth(1).fill('Password2!')
    // Submit button is disabled while passwords mismatch (correct UX) and the
    // mismatch message is shown inline. URL must stay on /signup.
    const submit = page.getByRole('button', { name: /create.*workspace|create.*account/i }).first()
    await expect(submit).toBeDisabled()
    await expect(page.getByText(/passwords.*do not match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('valid signup persists JWT and lands on /feed', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      const out = await signup(page, uniqueEmail('signup-good'))
      expect(out.accessToken, 'JWT bearer should be persisted').toBeTruthy()
    })
    await expect(page).toHaveURL(/\/feed/, { timeout: 15000 })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(post, 'signup should POST /api/users').toBeTruthy()
    expect(post!.status, 'signup POST should succeed').toBeLessThan(400)
  })

  test('signup link to /login navigates to login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.locator('a[href="/login"]').first()
    await link.click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('first-name and last-name fields accept and reflect typed values', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const first = page.locator('input[autocomplete="given-name"]').first()
    const last = page.locator('input[autocomplete="family-name"]').first()
    await first.fill('Aurelius')
    await last.fill('Lobo')
    await expect(first).toHaveValue('Aurelius')
    await expect(last).toHaveValue('Lobo')
  })

  test('email field accepts and reflects typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input[type="email"]').first()
    const value = uniqueEmail('signup-email-field')
    await email.fill(value)
    await expect(email).toHaveValue(value)
  })

  test('confirm password field validates against the first password input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input[autocomplete="new-password"]')
    await pw.nth(0).fill('Match123!')
    await pw.nth(1).fill('Match123!')
    // Submit-disabled=true means mismatch; passwords match so it should be enabled
    // (assuming all required fields are filled is checked elsewhere — here we just
    // assert no mismatch error appears).
    await expect(page.getByText(/passwords.*do not match/i)).toHaveCount(0)
  })

  test('Theme toggle flips data-mol-mode on /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })
})
