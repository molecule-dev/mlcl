/**
 * /forgot-password — entering an email triggers POST /api/users/forgot-password
 * (200 OK regardless of whether the email exists, by privacy design), and the
 * success state is rendered. Bad-shape input still gets a server response.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders the form with an email field and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input#forgot-email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link|reset/i }).first()).toBeVisible()
  })

  test('submitting a real email hits /api/users/forgot-password and shows the sent state', async ({
    page,
  }) => {
    const { email } = await signup(page, uniqueEmail('forgot-real'))
    await page.evaluate(() => window.localStorage.clear())

    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#forgot-email').fill(email)
      await page
        .getByRole('button', { name: /send reset link|reset/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })

    const apiCall = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url))
    expect(apiCall, 'forgot-password should hit /api/users/forgot-password').toBeTruthy()
    expect(apiCall!.status, 'should be 200 (deliberate; never reveals existence)').toBeLessThan(400)

    await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/check your email/i)).toBeVisible()
  })

  test('submitting an unknown email still 200s (privacy by design) and shows sent state', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#forgot-email').fill(uniqueEmail('forgot-unknown'))
      await page
        .getByRole('button', { name: /send reset link|reset/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    const apiCall = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url))
    expect(apiCall, 'forgot-password should be called').toBeTruthy()
    expect(
      apiCall!.status,
      'must NOT 4xx — that would let attackers enumerate emails',
    ).toBeLessThan(400)
    await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible({ timeout: 5000 })
  })

  test('"Back to sign in" links navigate to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.locator('a[href="/login"]').first()
    if (await link.count()) {
      await link.click()
    } else {
      await page
        .getByRole('link', { name: /back to sign in/i })
        .first()
        .click()
    }
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input#login-email')).toBeVisible()
  })
})
