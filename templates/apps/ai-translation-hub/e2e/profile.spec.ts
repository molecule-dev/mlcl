import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/profile: workspace member detail', () => {
  test('renders the workspace member heading with the user email', async ({ page }) => {
    const { email } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)
    })
    // /profile fetches /api/projects + /api/users/:id (the workspace summary).
    expect(reqs.find((r) => /\/api\/users\//.test(r.url) && r.method === 'GET')).toBeDefined()
    await expect(page.getByText(email, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/users/:id returns the signed-in user (read-after-write)', async ({ page }) => {
    const { accessToken, userId, email } = await signup(page)
    const res = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(300)
    const body = (await res.json()) as { props?: { email?: string }; email?: string }
    const got = body.props ?? body
    expect((got.email ?? '').toLowerCase()).toBe(email.toLowerCase())
  })

  test('Profile heading is visible on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    const h = page.getByRole('heading').first()
    await expect(h).toBeVisible()
  })
})
