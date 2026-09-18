import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the form', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /send|reset|email me|continue/i }).first(),
    ).toBeVisible()
  })

  test('submitting fires POST /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|email me|continue/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    const r = reqs.find(
      (r) => r.method === 'POST' && /forgot[-_]?password|reset[-_]?password/.test(r.url),
    )
    expect(r, 'forgot-password form must POST a reset request').toBeTruthy()
  })

  test('"back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })
})
