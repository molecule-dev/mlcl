/**
 * Landing subscribe form — the PUBLIC signup path. Subscribing an email
 * creates a subscriber row (verified via the authenticated API, not by
 * asserting on seeded demo content).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('landing subscribe form', () => {
  test('subscribing shows the confirmation state', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const email = uniqueEmail('landing-sub')
    await page.locator('#landing-subscribe-email').fill(email)
    await page.locator('#landing-subscribe-submit').click()
    await expect(page.locator('#landing-subscribed')).toBeVisible({ timeout: 15000 })
  })

  test('a subscribed email appears in the subscribers list via API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('sub-check'))
    const email = uniqueEmail('landing-api')
    await page.goto(APP_BASE + '/')
    await page.locator('#landing-subscribe-email').fill(email)
    await page.locator('#landing-subscribe-submit').click()
    await expect(page.locator('#landing-subscribed')).toBeVisible({ timeout: 15000 })
    // Read the expected value from the API inside the test (never from
    // fixture/demo content).
    const res = await page.request.get(`${API_BASE}/subscribers?q=${encodeURIComponent(email)}`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data: Array<{ email: string; status: string }> }
    const row = body.data.find((s) => s.email === email)
    expect(row, 'subscribe form must create a subscriber row').toBeTruthy()
    expect(row!.status).toBe('subscribed')
  })
})
