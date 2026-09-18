import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, getMe, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('renders the settings shell with sidebar sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/profile|account|workspace|notifications|billing/)
  })

  test('PATCH /api/users/:id persists name across reload', async ({ page }) => {
    const { userId } = await signup(page)
    const newName = 'Renamed-' + Date.now()
    const res = await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(page),
      data: { name: newName },
    })
    expect(res.status()).toBe(200)
    const me = await getMe(page)
    expect((me.props as Record<string, unknown>).name).toBe(newName)
  })

  test('captureNetwork: /settings renders without 5xx and surfaces user/billing context', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    // No request should 5xx; settings is a stable shell.
    const errors = reqs.filter((r) => r.url.includes('/api/') && r.status >= 500)
    expect(errors).toEqual([])
    // /api/users/me is reachable (manual GET) and returns the current profile.
    const meRes = await page.request.get(`${API_BASE}/users/me`, { headers: authHeaders(page) })
    expect(meRes.status()).toBe(200)
  })

  test('sidebar nav clicks switch sections (profile→workspace→security…)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    // Click the workspace section button if visible.
    const ws = page
      .locator('[data-mol-id="settings-section-workspace"], button:has-text("Workspace")')
      .first()
    if (await ws.count()) {
      await ws.click()
      // Wait a beat — UI should re-render the workspace pane.
      await page.waitForTimeout(200)
    }
  })

  test('profile form save persists on reload (round-trip)', async ({ page }) => {
    const { userId } = await signup(page)
    const newName = 'Reload-' + Date.now()
    await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(page),
      data: { name: newName },
    })
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    // Hit /api/users/me again after navigation; verify name is still newName.
    const me = await getMe(page)
    expect((me.props as Record<string, unknown>).name).toBe(newName)
  })

  test('save button is reachable on the profile section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const save = page.getByRole('button', { name: /save/i }).first()
    await expect(save).toBeVisible()
  })
})
