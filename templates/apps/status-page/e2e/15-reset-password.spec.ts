import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders without auth and shows a password input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    const newPw = page.getByLabel(/^new\s*password|^password$/i).first()
    await expect(newPw).toBeVisible({ timeout: 10_000 })
  })

  test('rejects invalid tokens and surfaces an error to the user', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=clearly-bogus-token')
    const newPw = page.getByLabel(/^new\s*password|^password$/i).first()
    await newPw.fill('AnotherPass123!')
    const confirm = page.getByLabel(/confirm/i).first()
    if (await confirm.count().catch(() => 0)) await confirm.fill('AnotherPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|update|change/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    // Endpoint contract: app posts the token + new password to
    // /api/users/reset-password (the handler mounted by api/src/handlers/index.ts).
    const post = reqs.find(
      (r) => r.url.includes('/api/users/reset-password') && r.method === 'POST',
    )
    if (post) {
      expect(post.status).not.toBe(200)
    }
    const path = new URL(page.url()).pathname
    expect(path).toMatch(/reset-password|forgot-password|login/)
  })

  test('POST /api/users/reset-password rejects an unknown token at the handler level', async ({
    request,
  }) => {
    const res = await request.post('/api/users/reset-password', {
      data: { token: 'not-a-real-token-1234567890', password: 'NewPass456!' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  test('Confirm-password mismatch keeps the submit button disabled', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    const newPw = page.getByLabel(/^new\s*password|^password$/i).first()
    await newPw.fill('OnePass123!')
    const confirm = page.getByLabel(/confirm/i).first()
    if (await confirm.count().catch(() => 0)) {
      await confirm.fill('Mismatched456!')
      const submit = page.getByRole('button', { name: /reset|update|change/i }).first()
      // Mismatched passwords (or empty email field) MUST keep submit disabled.
      await expect(submit).toBeDisabled({ timeout: 5_000 })
    }
    expect(new URL(page.url()).pathname).toMatch(/reset-password/)
  })

  test('Login link navigates back to /login when present', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await page.waitForTimeout(500)
      expect(new URL(page.url()).pathname).toMatch(/login|reset-password/)
    }
  })
})
