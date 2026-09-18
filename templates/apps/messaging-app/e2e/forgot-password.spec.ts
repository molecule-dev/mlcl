import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders email field and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset|continue|email/i })).toBeVisible()
  })

  test('submitting an email POSTs to /users/forgot-password', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.getByLabel(/email/i).fill(`forgot-${Date.now()}@example.com`)
      await page
        .getByRole('button', { name: /send|reset|continue|email/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    expect(
      reqs.some((r) => r.method === 'POST' && /\/users\/forgot-password\b/.test(r.url)),
    ).toBeTruthy()
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })
  })
})
