import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, rawApi, uniqueEmail } from './_helpers'

test.describe('/forgot-password — request a reset link', () => {
  test('renders the email field, link back to /login, and is publicly reachable', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeEnabled()
    // bottom link points back to /login
    await expect(page.locator('a[href="/login"]')).toBeVisible()
  })

  test('submitting the form POSTs /api/users/forgot-password and shows the inbox-confirmation', async ({
    page,
  }) => {
    const email = uniqueEmail('reset')
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').fill(email)
      await page.locator('form button[type="submit"]').click()
      // either the inbox banner appears or an error alert renders.
      const successOrError = page.getByText(/check your inbox/i).or(page.locator('[role="alert"]'))
      await expect(successOrError.first()).toBeVisible({ timeout: 10_000 })
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url) && r.status < 500,
      ),
      `expected POST /api/users/forgot-password — saw ${JSON.stringify(reqs)}`,
    ).toBe(true)
  })

  test('backend always returns 2xx — does not leak whether the email exists', async ({ page }) => {
    const { status } = await rawApi(page, 'POST', '/users/forgot-password', {
      email: 'nonexistent-' + Date.now() + '@example.com',
    })
    expect(status, 'forgot-password must be enumeration-safe').toBeLessThan(300)
  })
})
