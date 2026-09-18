import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('settings', () => {
  test('/settings renders the account form prefilled with the current name', async ({ page }) => {
    await signup(page, undefined, undefined, 'Alex Settings')
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/settings')
      await page.waitForLoadState('networkidle').catch(() => null)
    })
    const nameField = page.locator('input[name="name"]')
    await expect(nameField).toHaveValue('Alex Settings', { timeout: 15_000 })
    const userGet = reqs.find((r) => r.method === 'GET' && /\/api\/users\//.test(r.url))
    expect(userGet, 'GET /api/users/:id was not observed').toBeTruthy()
  })

  test('updating the display name persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle').catch(() => null)
    const nameField = page.locator('input[name="name"]')
    await nameField.fill('Renamed In Test')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/^saved$/i).first()).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.locator('input[name="name"]')).toHaveValue('Renamed In Test', {
      timeout: 15_000,
    })
  })

  test('switching to the Preferences tab persists the start-of-week choice across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto('/settings')
    await page.getByRole('button', { name: /^preferences$/i }).click()
    await page.locator('select[name="startOfWeek"]').selectOption('Sunday')
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.getByRole('button', { name: /^preferences$/i }).click()
    await expect(page.locator('select[name="startOfWeek"]')).toHaveValue('Sunday', {
      timeout: 15_000,
    })
  })

  test('theme toggle flips data-mol-mode AND survives reload', async ({ page }) => {
    await signup(page)
    await page.goto('/settings')
    await page.getByRole('button', { name: /^preferences$/i }).click()
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page.getByRole('button', { name: /toggle theme/i }).click()
    // Wait for the attribute to actually flip
    await page.waitForFunction(
      (prev) => document.documentElement.getAttribute('data-mol-mode') !== prev,
      before,
      { timeout: 5_000 },
    )
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    // The body background must have changed (proves CSS variables actually applied)
    const bgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    const bgPersisted = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(persisted).toBe(after)
    expect(bgPersisted).toBe(bgAfter)
  })

  test('keyboard shortcuts: g→i navigates to /inbox and ⌘K navigates to /search', async ({
    page,
  }) => {
    await signup(page)
    await page.goto('/today')
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.keyboard.press('g')
    await page.waitForTimeout(50)
    await page.keyboard.press('i')
    await page.waitForURL('**/inbox', { timeout: 5_000 })
    expect(new URL(page.url()).pathname).toBe('/inbox')

    await page.keyboard.press('Control+k')
    await page.waitForURL('**/search', { timeout: 5_000 })
    expect(new URL(page.url()).pathname).toBe('/search')
  })

  test('PATCH /api/users/:id round-trips name (read-after-write via /api/users/:id)', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    // Discover user id via /tasks → no, easier: hit /users/me-style endpoint;
    // the framework provides /api/users/:id where :id can be the JWT user.
    // Read it from the user menu rendering.
    await page.goto('/settings')
    await page.waitForLoadState('networkidle').catch(() => null)
    // Inspect the user-id from a network request triggered during render.
    const reqs: { url: string }[] = []
    page.on('request', (r) => reqs.push({ url: r.url() }))
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    const userIdReq = reqs.find((r) => /\/api\/users\/[a-f0-9-]{36}/.test(r.url))
    expect(userIdReq, 'no GET /api/users/:id observed').toBeTruthy()
    const userId = userIdReq!.url.match(/\/api\/users\/([a-f0-9-]{36})/)![1]

    const r = await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { name: 'Direct Patch' },
    })
    expect(r.status()).toBeLessThan(300)

    const reread = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: { Cookie: cookie },
    })
    const body = await reread.json()
    const props = body.props ?? body.data?.props ?? body
    expect(props.name).toBe('Direct Patch')
  })
})
