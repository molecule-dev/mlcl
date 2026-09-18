import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, signup } from './_helpers.js'

test.describe('/settings (Settings)', () => {
  test('"Daily goals" account link navigates to /goals', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('link', { name: /daily goals/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/goals/)
  })

  test('"Streak alerts" toggle PUTs notification-preferences and persists across reload', async ({
    page,
  }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const before = await api<{ streak?: boolean }>(page, 'GET', '/notification-preferences')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('label:has(input[aria-label="Streak alerts"])').click()
      await page.waitForTimeout(800)
    })
    const put = reqs.find(
      (r) => /\/api\/notification-preferences/.test(r.url) && r.method === 'PUT',
    )
    expect(put).toBeTruthy()
    const after = await api<{ streak?: boolean }>(page, 'GET', '/notification-preferences')
    expect(Boolean(after.streak)).not.toEqual(Boolean(before.streak))
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    const reloaded = await api<{ streak?: boolean }>(page, 'GET', '/notification-preferences')
    expect(reloaded.streak).toEqual(after.streak)
  })

  test('"Meal reminders" toggle PUTs notification-preferences', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page.locator('label:has(input[aria-label="Meal reminders"])').click()
      await page.waitForTimeout(800)
    })
    const put = reqs.find(
      (r) => /\/api\/notification-preferences/.test(r.url) && r.method === 'PUT',
    )
    expect(put).toBeTruthy()
  })

  test('"Sign out" clears the session and /today redirects to /login', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    await page.goto(APP_BASE + '/today')
    await page.waitForTimeout(800)
    expect(page.url()).toMatch(/\/(login|signup|$)/)
  })

  test('"Delete account" reveals the password confirm form', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /delete account/i })
      .first()
      .click()
    await expect(page.locator('input[type=password]').first()).toBeVisible()
  })

  test('Confirm delete with password permanently deletes the account (DELETE /users/:id) and signs out', async ({
    page,
  }) => {
    const { password } = await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /delete account/i })
      .first()
      .click()
    await page.locator('input[type=password]').first().fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /permanently delete/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const del = reqs.find((r) => /\/api\/users\/[^/]+/.test(r.url) && r.method === 'DELETE')
    expect(del, 'DELETE /api/users/:id fired').toBeTruthy()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })
})
