import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/settings (Settings)', () => {
  test('renders the Settings heading and fetches /api/billing/status', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /Settings/i, level: 1 })).toBeVisible()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const status = reqs.find((r) => /\/api\/billing\/status/.test(r.url) && r.method === 'GET')
    expect(status, 'GET /api/billing/status fired').toBeTruthy()
    expect(status!.status).toBeLessThan(300)
  })

  test('Account section nav button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const btn = page.locator('[data-mol-id="settings-section-account"]')
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Motion preferences section nav button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const btn = page.locator('[data-mol-id="settings-section-preferences"]')
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Team section nav button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const btn = page.locator('[data-mol-id="settings-section-team"]')
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Billing section nav button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const btn = page.locator('[data-mol-id="settings-section-billing"]')
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('display-name input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const inp = page.locator('input#settings-name')
    await inp.fill('Renamed User')
    await expect(inp).toHaveValue('Renamed User')
  })

  test('email input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const inp = page.locator('input#settings-email')
    await inp.fill('renamed@example.com')
    await expect(inp).toHaveValue('renamed@example.com')
  })

  test('Save changes PATCHes /api/users/:id and the new name persists across reload', async ({
    page,
  }) => {
    const password = 'TestPass123!'
    const email = uniqueEmail('settings-save')
    await signup(page, email, password)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})

    const newName = `Settings Save ${Date.now()}`
    await page.locator('input#settings-name').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-account-save"]').click()
      await page.waitForTimeout(2_000)
    })
    const patch = reqs.find(
      (r) =>
        /\/api\/users\/[^/]+(?:\?|$)/.test(r.url) && (r.method === 'PATCH' || r.method === 'PUT'),
    )
    expect(patch, 'PATCH /api/users/:id fired').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)

    // Invariant: reload and ensure the new name is still in the DOM input.
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('input#settings-name')).toHaveValue(newName)
  })

  test('current-password input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const inp = page.locator('input#settings-current-pw')
    await inp.fill('OldPass123!')
    await expect(inp).toHaveValue('OldPass123!')
  })

  test('new-password input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const inp = page.locator('input[type=password][placeholder*="New password"]')
    await inp.fill('NewPass456!')
    await expect(inp).toHaveValue('NewPass456!')
  })

  test('Update password PATCHes /api/users/:id/password and the OLD password is rejected on next login', async ({
    page,
  }) => {
    const oldPw = 'TestPass123!'
    const newPw = 'NewPa55Word!'
    const email = uniqueEmail('settings-pwch')
    await signup(page, email, oldPw)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})

    await page.locator('input#settings-current-pw').fill(oldPw)
    await page.locator('input[type=password][placeholder*="New password"]').fill(newPw)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Update password/i }).click()
      await page.waitForTimeout(3_000)
    })
    const patch = reqs.find(
      (r) =>
        /\/api\/users\/[^/]+\/password/.test(r.url) && (r.method === 'PATCH' || r.method === 'PUT'),
    )
    expect(patch, 'PATCH /api/users/:id/password fired').toBeTruthy()
    // The PATCH must actually succeed — a 4xx would mean the password
    // didn't actually change, so the OLD-password rejection invariant
    // below would be a false positive.
    expect(patch!.status, 'password change must succeed (2xx)').toBeLessThan(300)

    // Invariant: log out, attempt to log in with the OLD password — should fail.
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type=email]').fill(email)
    await page.locator('input[type=password]').first().fill(oldPw)
    const loginReqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /sign\s*in/i }).click()
      await page.waitForTimeout(2_000)
    })
    const loginCall = loginReqs.find(
      (r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST',
    )
    expect(loginCall, 'login call fired with OLD password').toBeTruthy()
    // OLD password must NOT yield a 2xx (would indicate the change didn't persist).
    expect(loginCall!.status, 'old password must be rejected after change').toBeGreaterThanOrEqual(
      400,
    )
  })

  test('Sign out clears auth and lands on / or /login', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-logout"]').click()
    await page.waitForURL((u) => !u.pathname.includes('/settings'), { timeout: 10_000 })
    expect(page.url()).not.toMatch(/\/settings/)
  })

  test('Compare plans button is visible in the billing section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('button', { name: /Compare plans/i })).toBeVisible()
  })
})
