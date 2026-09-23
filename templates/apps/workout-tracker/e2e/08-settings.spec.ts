import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, API_BASE, captureNetwork } from './_helpers.js'

test.describe('/settings persistence', () => {
  // The Settings page persists through the server-side GET/PATCH /api/settings
  // channel: the platform user resource never returns `oauthData` on reads, so
  // preferences written via PATCH /users/:id silently evaporate on the next GET.
  test('weight unit toggle persists across reload via PATCH /api/settings', async ({ page }) => {
    await signup(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle').catch(() => null)

    const select = page.getByTestId('pref-weight-unit')
    await expect(select).toBeVisible({ timeout: 15000 })
    const initial = await select.inputValue()
    const next = initial === 'kg' ? 'lbs' : 'kg'

    const reqs = await captureNetwork(page, async () => {
      await select.selectOption(next)
      // Wait for the PATCH to settle by polling the server.
      await page.waitForTimeout(800)
    })
    const patch = reqs.find((r) => /\/api\/settings/.test(r.url) && r.method === 'PATCH')
    expect(patch, 'PATCH /api/settings was not observed when toggling weight unit').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)

    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    const after = await page.getByTestId('pref-weight-unit').inputValue()
    expect(after).toBe(next)
  })

  test('rest timer change persists server-side (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle').catch(() => null)

    await page.getByTestId('pref-rest-timer').selectOption('180')
    await page.waitForTimeout(800)

    // Verify on server: GET /api/settings reflects the saved preference.
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const settings = await page.request.get(`${API_BASE}/settings`, {
      headers: { Cookie: cookieHeader },
    })
    expect(settings.status()).toBe(200)
    const body = await settings.json()
    const prefs = (body?.preferences as Record<string, unknown> | undefined) ?? {}
    expect(prefs.restTimerSeconds).toBe(180)
  })

  test('PR notification toggle persists', async ({ page }) => {
    await signup(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle').catch(() => null)

    await page.getByTestId('settings-tab-notifications').click()
    const toggle = page.getByTestId('pref-notify-pr')
    await expect(toggle).toBeVisible({ timeout: 15000 })
    const initial = await toggle.isChecked()

    await toggle.click()
    await page.waitForTimeout(800)

    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.getByTestId('settings-tab-notifications').click()
    const after = await page.getByTestId('pref-notify-pr').isChecked()
    expect(after).toBe(!initial)
  })
})

test.describe('account deletion', () => {
  test('delete account modal removes the user and redirects to /login', async ({ page }) => {
    const res = await signup(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.getByTestId('settings-delete-account').click()
    await expect(page.getByTestId('settings-delete-modal')).toBeVisible()
    await page.getByTestId('settings-delete-password').fill(res.password)
    // The logout call after a successful self-deletion 401s by design (the
    // session was revoked with the account), and the read-after-delete login
    // below 403s by design (the user is gone) — both surface as console
    // errors, so allow them before they fire.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.getByTestId('settings-delete-submit').click()
    await page.waitForURL(/\/login/, { timeout: 15000 })

    // Read-after-delete: trying to log in with the same creds fails (user gone).
    await page.getByLabel(/email/i).first().fill(res.email)
    await page
      .getByLabel(/password/i)
      .first()
      .fill(res.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    // Should NOT navigate away from /login (login fails on a deleted account).
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })
})
