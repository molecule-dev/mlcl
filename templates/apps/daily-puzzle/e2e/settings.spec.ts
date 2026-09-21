import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bearerToken,
  captureNetwork,
  flipThemeAndAssertChanged,
  signup,
} from './_helpers.js'

test.describe('/settings', () => {
  test('renders settings landmark', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings')).toBeVisible()
  })

  test('renders header brand link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('link', { name: /^lexlet/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await flipThemeAndAssertChanged(page)
  })

  test('user-menu opens with menu items', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test("profile-name shows the signed-in user's name", async ({ page }) => {
    const auth = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('profile-name')).toContainText(auth.name)
  })

  test('"Edit profile" button toggles inline form open', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('edit-profile').click()
    await expect(page.getByTestId('profile-form')).toBeVisible()
  })

  test('profile-name-input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('edit-profile').click()
    await page.getByTestId('profile-name-input').fill('New Name')
    expect(await page.getByTestId('profile-name-input').inputValue()).toBe('New Name')
  })

  test('profile-username-input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('edit-profile').click()
    await page.getByTestId('profile-username-input').fill('newhandle')
    expect(await page.getByTestId('profile-username-input').inputValue()).toBe('newhandle')
  })

  test('profile-save PATCHes /api/users/{id} and persists (read-after-write)', async ({ page }) => {
    const auth = await signup(page)
    const token = await bearerToken(page)
    // Decode user id from JWT payload so we can probe /api/users/{id}.
    const userId = await (async () => {
      try {
        const payload = token.split('.')[1] ?? ''
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        return decoded.sub ?? decoded.userId ?? decoded.id ?? null
      } catch {
        return null
      }
    })()
    expect(userId).toBeTruthy()
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('edit-profile').click()
    const newName = `Renamed-${Date.now()}`
    await page.getByTestId('profile-name-input').fill(newName)
    const patchPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/users\//.test(r.url()),
      { timeout: 15000 },
    )
    await page.getByTestId('profile-save').click()
    const patch = await patchPromise
    expect(patch.status()).toBeLessThan(400)
    await expect(page.getByTestId('profile-message')).toBeVisible({ timeout: 10000 })
    // Backend confirms via GET /api/users/{id}
    const me = await page.request.get(`${API_BASE}/users/${userId}`, { headers: apiHeaders(token) })
    expect(me.status()).toBeLessThan(400)
    const body = (await me.json()) as {
      props?: { name?: string; email?: string }
      data?: { props?: { name?: string; email?: string } }
    }
    const props = body.data?.props ?? body.props ?? {}
    expect(props.name ?? '').toBe(newName)
    expect(props.email).toBe(auth.email)
  })

  test('haptics preference toggle flips aria-pressed and persists to localStorage', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const toggle = page.getByTestId('pref-haptics')
    const before = await toggle.getAttribute('aria-pressed')
    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-pressed', before ?? '')
    const stored = await page.evaluate(() => localStorage.getItem('lexlet:prefs:v1'))
    expect(stored).toBeTruthy()
  })

  test('tileSounds preference toggle flips aria-pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const toggle = page.getByTestId('pref-tileSounds')
    const before = await toggle.getAttribute('aria-pressed')
    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-pressed', before ?? '')
  })

  test('notifications preference toggle flips aria-pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const toggle = page.getByTestId('pref-notifications')
    const before = await toggle.getAttribute('aria-pressed')
    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-pressed', before ?? '')
  })

  test('showInLeaderboard preference toggle flips aria-pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const toggle = page.getByTestId('pref-showInLeaderboard')
    const before = await toggle.getAttribute('aria-pressed')
    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-pressed', before ?? '')
  })

  test('Delete account button reveals confirm + cancel controls', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('delete-account').click()
    await expect(page.getByTestId('confirm-delete')).toBeVisible()
    await expect(page.getByTestId('cancel-delete')).toBeVisible()
  })

  test('Cancel delete returns to default state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('delete-account').click()
    await page.getByTestId('cancel-delete').click()
    await expect(page.getByTestId('confirm-delete')).toHaveCount(0)
    await expect(page.getByTestId('delete-account')).toBeVisible()
  })

  test('Confirm delete DELETEs /api/users/{id}, logs out, navigates to / (read-after-write)', async ({
    page,
  }) => {
    const auth = await signup(page)
    const token = await bearerToken(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('delete-account').click()
    // Expected 4xx: after the DELETE succeeds, the best-effort logout POST
    // runs with the now-deleted user's bearer and is rejected (401).
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 4\\d\\d' })
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('confirm-delete').click()
      await page.waitForURL(APP_BASE + '/', { timeout: 15000 })
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/users\//.test(r.url))
    expect(del).toBeTruthy()
    expect(del?.status).toBeLessThan(400)
    await expect(page).toHaveURL(APP_BASE + '/')
    // Subsequent /api/users/me with the old bearer should fail
    const me = await page.request.get(`${API_BASE}/users/me`, {
      headers: apiHeaders(token),
      failOnStatusCode: false,
    })
    expect(me.status()).toBeGreaterThanOrEqual(400)
    expect(auth.email).toBeTruthy()
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
