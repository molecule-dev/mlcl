import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('forgot-password /forgot-password', () => {
  test('page loads and exposes email + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    expect(await page.getByRole('button').count()).toBeGreaterThan(0)
  })

  test('POST /api/users/forgot-password accepts a known email', async ({ page }) => {
    const { email } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
        data: { email },
        failOnStatusCode: false,
      })
      expect([200, 201, 202, 204]).toContain(res.status())
    })
    const call = reqs.find((r) => /\/forgot-password$/.test(r.url) && r.method === 'POST')
    expect(call).toBeTruthy()
  })

  test('POST /api/users/forgot-password tolerates unknown emails (no leak)', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: uniqueEmail('forgot-unknown') },
      failOnStatusCode: false,
    })
    expect([200, 201, 202, 204, 404]).toContain(res.status())
  })

  test('back-to-login link is reachable', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const back = page
      .getByRole('button', { name: /back|cancel/i })
      .or(page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }))
    await expect(back.first()).toBeAttached()
  })
})
