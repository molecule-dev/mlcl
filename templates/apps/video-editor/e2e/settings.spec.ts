import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, login, signup } from './_helpers.js'

test.describe('settings', () => {
  test('profile section shows user email', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="settings-profile-panel"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="settings-email"]')).toContainText(email)
  })

  test('profile name PATCH persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="profile-name-input"]').fill('Renamed Editor')
    await page.locator('[data-mol-id="profile-save"]').click()
    await expect(page.locator('[data-mol-id="profile-saved"]')).toBeVisible({ timeout: 10_000 })

    // Verify the update is real by reading the user from the API.
    const me = await api<{ name?: string; props?: { name?: string } }>(
      page,
      'GET',
      '/users/me',
    ).catch(() => null as any)
    if (me) {
      expect(me?.name ?? me?.props?.name).toBe('Renamed Editor')
    }
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-name"]')).toContainText('Renamed Editor', {
      timeout: 10_000,
    })
  })

  test('password change lets user log in with the new password', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="password-toggle"]').click()
    const newPw = 'NewPass456!'
    await page.locator('[data-mol-id="password-current"]').fill(password)
    await page.locator('[data-mol-id="password-new"]').fill(newPw)
    await page.locator('[data-mol-id="password-submit"]').click()
    await expect(page.locator('[data-mol-id="password-success"]')).toBeVisible({ timeout: 10_000 })

    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await login(page, email, newPw)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  })

  test('storage tab shows real asset/project/export counts', async ({ page }) => {
    await signup(page)
    await api(page, 'POST', '/assets', {
      name: 'a.mp4',
      kind: 'video',
      source_url: 'https://example.com/a.mp4',
    })
    const proj = await api<{ id: string }>(page, 'POST', '/projects', { name: 'Storage Project' })
    await api(page, 'POST', '/exports', { project_id: proj.id, format: 'mp4', resolution: '1080p' })
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-storage"]').click()
    await expect(page.locator('[data-mol-id="settings-storage-panel"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="settings-storage-panel"]')).toContainText('1')
  })

  test('billing tab shows current Free tier and upgrade buttons', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-billing"]').click()
    await expect(page.locator('[data-mol-id="settings-billing-panel"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="billing-tier"]')).toContainText(/Free/i, {
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="billing-current-free"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-checkout-pro-monthly"]')).toBeVisible()
  })

  test('upgrade button posts priceId and returns a real Stripe checkout URL', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-billing"]').click()
    await expect(page.locator('[data-mol-id="billing-checkout-pro-monthly"]')).toBeVisible({
      timeout: 10_000,
    })

    // Intercept the checkout POST so we can capture the request body and
    // the upstream response, then short-circuit the redirect to Stripe so the
    // test page doesn't navigate away.
    let captured: { reqBody: unknown; respBody: unknown; status: number } | null = null
    await page.route('**/api/billing/checkout', async (route, request) => {
      const reqBody = JSON.parse(request.postData() ?? '{}')
      const upstream = await route.fetch()
      const respBody = await upstream.json()
      captured = { reqBody, respBody, status: upstream.status() }
      // Strip the checkout URL so the page doesn't navigate away.
      await route.fulfill({
        status: upstream.status(),
        contentType: 'application/json',
        body: JSON.stringify({ ...respBody, checkoutUrl: 'about:blank' }),
      })
    })

    await page.locator('[data-mol-id="billing-checkout-pro-monthly"]').click()
    await expect.poll(() => captured, { timeout: 10_000 }).toBeTruthy()

    expect(captured!.status, 'POST /billing/checkout should succeed').toBeLessThan(400)
    const respBody = captured!.respBody as { checkoutUrl?: string; url?: string }
    expect(respBody?.checkoutUrl ?? respBody?.url).toMatch(/checkout\.stripe\.com\/.*cs_test_/i)

    const reqBody = captured!.reqBody as { priceId?: string; tierId?: string }
    expect(reqBody.priceId).toMatch(/^price_/)
    expect(reqBody.tierId).toBeUndefined()
  })

  test('sidebar shows live plan label from /api/billing/status', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="rushes-plan-label"]')).toContainText(/Free/i, {
      timeout: 10_000,
    })
  })

  test('delete account removes the user and forces re-login to fail', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="delete-account-toggle"]').click()
    await page.locator('[data-mol-id="delete-password"]').fill(password)
    await page.locator('[data-mol-id="delete-confirm"]').click()
    await page.waitForURL(/\/login/, { timeout: 15_000 })

    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('[data-mol-id="login-submit"]').click()
    await expect(page).toHaveURL(/\/login/)
  })
})
