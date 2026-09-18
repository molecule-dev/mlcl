import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork } from './_helpers'

test.describe('/reset-password', () => {
  test('renders email + token + password fields and submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /recovery|token|code|reset/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /reset|set.*password|sign|submit/i }).first(),
    ).toBeVisible()
  })

  test('POST /api/users/reset-password is wired and not 404', async ({ page }) => {
    // Use a bogus token; we only care that the route exists (not 404)
    const resp = await page.request.post(API_BASE + '/users/reset-password', {
      data: { resetToken: 'invalid', email: 'nobody@example.com', password: 'NewPass456!' },
    })
    expect(resp.status()).not.toBe(404)
    // Server may respond 400 (invalid token) or similar — but never 404.
    expect(resp.status()).toBeGreaterThanOrEqual(400)
    expect(resp.status()).toBeLessThan(500)
  })

  test('Submitting the form fires POST /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('textbox', { name: /email/i }).fill('nobody@example.com')
    await page.getByRole('textbox', { name: /recovery|token|code|reset/i }).fill('badtoken')
    await page.getByRole('textbox', { name: /password/i }).fill('NewPass456!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|set.*password|sign|submit/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const resetCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url),
    )
    expect(resetCall, 'reset-password POST must fire').toBeDefined()
    expect(resetCall!.status).not.toBe(404)
  })

  test('Heading is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(
      page.getByRole('heading', { name: /pick up|reset|password/i }).first(),
    ).toBeVisible()
  })

  test('Back-to-login link → /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const a = page.getByRole('link', { name: /back|sign.*in|login/i }).first()
    if (await a.count()) {
      const href = await a.getAttribute('href')
      expect(href).toBe('/login')
    }
  })
})
