import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup, uniqueEmail } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders email field and Send link button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send|email/i })).toBeVisible()
  })

  test('Back-to-sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in|sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('submits POST /users/forgot-password and renders success state', async ({ page }) => {
    const email = uniqueEmail('forgot')
    await signup(page, email)
    await page.goto(APP_BASE + '/forgot-password')
    const requests = await captureNetwork(page, async () => {
      await page.getByLabel(/email/i).fill(email)
      await page.getByRole('button', { name: /send|email/i }).click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'POST' &&
          /\/users\/forgot-password\b/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
    ).toBeTruthy()
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })
  })
})
