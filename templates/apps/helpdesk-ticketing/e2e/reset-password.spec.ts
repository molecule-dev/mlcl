import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('helpdesk-ticketing: /reset-password', () => {
  test('GET /reset-password renders password + confirm fields', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/reset-password?token=fake-token')
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 15_000 })
  })

  test('POST /api/users/reset-password is wired up (regression — was 404)', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: {},
      failOnStatusCode: false,
    })
    expect(res.status()).not.toBe(404)
    expect(res.status()).toBeLessThan(500)
  })

  test('POST /api/users/reset-password rejects an obviously invalid token', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'definitely-not-a-real-token', password: 'NewPass123!' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('submitting the reset form posts to /api/users/reset-password (captured)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=walking-test-token')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="password"]').first().fill('NewWalkingPass1!')
      const second = page.locator('input[type="password"]').nth(1)
      if (await second.count()) await second.fill('NewWalkingPass1!')
      await page
        .getByRole('button', { name: /reset\s*password|set\s*password|update/i })
        .first()
        .click()
      await page.waitForTimeout(750)
    })
    expect(
      reqs.some((r) => r.method === 'POST' && r.url.includes('/api/users/reset-password')),
    ).toBe(true)
  })
})
