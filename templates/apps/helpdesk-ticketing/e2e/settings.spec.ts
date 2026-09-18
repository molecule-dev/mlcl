import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: /settings', () => {
  test('/settings renders without throwing the RootErrorBoundary', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[role=alert]')).toHaveCount(0)
  })

  test('legacy /settings/team falls back to /settings (Navigate route)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/team')
    await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 })
  })

  test('/billing redirects to /settings (Navigate route — billing lives inside settings)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 })
  })

  test('/profile redirects to /settings (Navigate route — profile lives inside settings)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 })
  })

  test('/security redirects to /settings (Navigate route — security lives inside settings)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/security')
    await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 })
  })

  test('/search redirects to /tickets (Navigate route — search lives inside the tickets list)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await expect(page).toHaveURL(/\/tickets$/, { timeout: 10_000 })
  })

  test('/settings mount issues GET /api/users/me to hydrate the profile pane', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => r.url.includes('/api/users/me'))).toBe(true)
  })

  test('GET /api/users/me returns the current authed user', async ({ page }) => {
    const session = await signup(page)
    const res = await page.request.get(`${API_BASE}/users/me`, {
      headers: authHeaders(session.accessToken),
    })
    expect(res.status()).toBe(200)
    // User.read returns { props: { id, email, ... }, plan?, twoFactorEnabled? }
    const body = (await res.json()) as { props?: { id?: string; email?: string } }
    expect(body.props?.id ?? '').toBe(session.userId)
    expect((body.props?.email ?? '').toLowerCase()).toBe(session.email.toLowerCase())
  })
})
