import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.getByLabel(/email/i).first()
    await email.fill('someone@example.com')
    await expect(email).toHaveValue('someone@example.com')
  })

  test('Send reset link submits a real POST and shows the success card', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = uniqueEmail('forgot')
    await page.getByLabel(/email/i).first().fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      // Either: success card appears (best case) or the request just fires.
      await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 10_000 })
    })
    const fp = reqs.find(
      (r) =>
        /\/api\/users\/forgot-password|\/api\/users\/password-reset|\/api\/auth\/forgot/.test(
          r.url,
        ) && r.method === 'POST',
    )
    expect(fp, 'a forgot-password POST should fire').toBeTruthy()
    // Either 200 (delivered) or 202 (queued) — anything <300 means the
    // handler did not silently swallow. We do NOT accept 4xx/5xx here.
    expect(fp!.status).toBeLessThan(300)
  })

  test('Back to sign in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
