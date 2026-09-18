import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders email input + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset|submit/i }).first()).toBeVisible()
  })

  test('valid email submits and shows success message', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.waitForLoadState('networkidle')
    const email = uniqueEmail('forgot-success')
    await page.locator('input[type="email"]').first().fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|submit/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(call).toBeTruthy()
    expect(call!.status).toBe(200)
    // The page should now show the "check your inbox" success state.
    await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible()
  })

  test('back-to-sign-in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*in|login|back/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('POST /api/users/forgot-password directly returns 200', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: 'nonexistent-' + Date.now() + '@example.com' },
    })
    // Always 200 to prevent enumeration.
    expect(res.status()).toBe(200)
  })
})
