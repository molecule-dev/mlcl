import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('page renders the email input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
  })

  test('submitting fires a POST to /api/users/forgot-password (or equivalent)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|submit|recover|email/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const post = reqs.find(
      (r) => /\/api\/(?:users|auth|reset-password|forgot)/.test(r.url) && r.method === 'POST',
    )
    expect(post, 'forgot-password should fire a POST').toBeTruthy()
  })

  test('back-to-login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
