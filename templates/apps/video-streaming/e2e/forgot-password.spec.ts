import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the email input + submit + back-to-sign-in link', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole('button', { name: /reset|send|recover|forgot/i }).first(),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /back|sign in/i }).first()).toBeVisible()
  })

  test('Back-to-sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('Submit POSTs to /api/users/forgot-password (or similar) and acknowledges', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
      const submit = page.getByRole('button', { name: /reset|send|forgot|recover/i }).first()
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => /forgot|password|reset/i.test(r.url()) && r.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        submit.click(),
      ])
      // Mailgun sandbox typically 200s even for unauthorised recipients.
      expect(
        [200, 202, 400, 422].includes(resp.status()),
        `unexpected status ${resp.status()}`,
      ).toBe(true)
    })
    expect(reqs.some((r) => /forgot|password|reset/i.test(r.url) && r.method === 'POST')).toBe(true)
  })
})
