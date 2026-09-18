import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('signup /signup', () => {
  test('signup stores access token + persists user record', async ({ page }) => {
    const email = uniqueEmail('sig')
    const result = await signup(page, email)
    expect(result.accessToken.length).toBeGreaterThan(40)
    expect(result.userId).toMatch(/^[0-9a-f-]{36}$/)
    // [M1-1] Token is now in the httpOnly cookie, not localStorage.
    const stored = await getAccessToken(page)
    expect(stored).toBe(result.accessToken)
  })

  test('UI form fields render and the submit button is reachable', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const inputs = await page.locator('input').count()
    expect(inputs).toBeGreaterThanOrEqual(3)
    await expect(page.getByRole('button', { name: /sign\s*up/i }).first()).toBeVisible()
  })

  test('signup hits POST /api/users via captureNetwork', async ({ page }) => {
    const email = uniqueEmail('sig-net')
    const reqs = await captureNetwork(page, async () => {
      const res = await page.request.post(`${API_BASE}/users`, {
        data: { email, password: 'TestPass123!', name: 'Net Signup' },
        failOnStatusCode: false,
      })
      expect(res.status()).toBe(201)
    })
    const created = reqs.find((r) => /\/api\/users(?!\/log-in)/.test(r.url) && r.method === 'POST')
    expect(created?.status).toBe(201)
  })

  test('cannot create the same email twice', async ({ page }) => {
    const email = uniqueEmail('sig-dup')
    await signup(page, email)
    const dup = await page.request.post(`${API_BASE}/users`, {
      data: { email, password: 'TestPass123!', name: 'Dup' },
      failOnStatusCode: false,
    })
    expect(dup.status()).not.toBe(201)
  })
})
