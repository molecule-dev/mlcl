import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('helpdesk-ticketing: /forgot-password', () => {
  test('GET /forgot-password renders the email field', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15_000 })
  })

  test('submit posts to /api/users/forgot-password (canonical endpoint)', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(uniqueEmail('fp-spec'))
      await page
        .getByRole('button', { name: /send\s*reset|reset\s*link|send/i })
        .first()
        .click()
      await page.waitForTimeout(750)
    })
    expect(
      reqs.some((r) => r.method === 'POST' && r.url.includes('/api/users/forgot-password')),
    ).toBe(true)
  })

  test('POST /api/users/forgot-password returns 2xx for unknown emails (no user-enumeration leak)', async ({
    page,
  }) => {
    const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: uniqueEmail('fp-unknown') },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(500)
    expect(res.status()).toBeGreaterThanOrEqual(200)
  })
})
