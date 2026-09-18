import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password /reset-password', () => {
  test('page loads and renders password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    expect(await page.locator('input[type="password"]').count()).toBeGreaterThanOrEqual(1)
  })

  test('submit button visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    expect(await page.getByRole('button').count()).toBeGreaterThan(0)
  })

  test('invalid token rejected by API', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'bogus', password: 'NewPass123!' },
      failOnStatusCode: false,
    })
    expect(res.status()).not.toBe(200)
  })

  test('cancel/back link available', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    const back = page.getByRole('button', { name: /back|cancel/i }).or(page.getByRole('link'))
    await expect(back.first()).toBeAttached()
  })

  test('captureNetwork sees POST /api/users/reset-password attempt', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.request.post(`${API_BASE}/users/reset-password`, {
        data: { token: 'invalid-token', password: 'NewPass123!' },
        failOnStatusCode: false,
      })
    })
    const call = reqs.find((r) => /\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(call).toBeTruthy()
  })
})
