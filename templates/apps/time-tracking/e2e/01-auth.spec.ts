import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, login, logout, signup, uniqueEmail } from './_helpers.js'

test.describe('01: auth — signup, login, sign-out, password change, forgot password', () => {
  test('signup → land on dashboard, JWT in localStorage, sidebar shows user', async ({ page }) => {
    const auth = await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)
    expect(auth.accessToken).toMatch(/^eyJ/)
    expect(auth.userId).toBeTruthy()
    // Sidebar has the user widget with sign-out
    await expect(page.locator('[data-test=layout-user]')).toBeVisible()
    await expect(page.locator('[data-test=sign-out]')).toBeVisible()
  })

  test('sign-out clears auth and protected routes redirect to /login', async ({ page }) => {
    await signup(page)
    await logout(page)
    await expect(page).toHaveURL(/\/login/)
    // Auth keys cleared
    const tok = await getAccessToken(page)
    expect(tok).toBeNull()
    // Protected route bounces back to /login
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('login → reload preserves session', async ({ page }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await logout(page)
    await login(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('[data-test=sign-out]')).toBeVisible()
  })

  test('change password — old password rejected, new password accepted on next login', async ({
    page,
  }) => {
    // Expected 4xx noise the console guard must allow: after the password
    // change the platform revokes the session, so the sign-out POST returns
    // 401, and the deliberate old-password login attempt returns 403.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of (401|403)',
    })
    const email = uniqueEmail('pw')
    const oldPw = 'TestPass!1234'
    const newPw = 'BrandNew!9876'
    await signup(page, email, oldPw)

    // Change password via Settings → Security
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-security]').click()
    await page.locator('[data-test=password-current]').fill(oldPw)
    await page.locator('[data-test=password-new]').fill(newPw)
    await page.locator('[data-test=password-save]').click()
    await expect(page.locator('text=/password updated/i')).toBeVisible({ timeout: 10000 })

    // Sign out, then old password must NOT log in
    await logout(page)
    await page.goto(APP_BASE + '/login')
    await page.locator('[data-test=login-email]').fill(email)
    await page.locator('[data-test=login-password]').fill(oldPw)
    await page.locator('[data-test=login-submit]').click()
    // Stay on /login (failed)
    await page.waitForTimeout(2500)
    expect(page.url()).toMatch(/\/login/)

    // New password must log in
    await page.locator('[data-test=login-password]').fill(newPw)
    await page.locator('[data-test=login-submit]').click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })

  test('forgot password — POST /api/users/forgot-password fires and inbox confirmation appears', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"], input[autocomplete="email"]').first().fill(email)

    let posted: { url: string; status: number } | null = null
    page.on('response', (r) => {
      if (r.request().method() === 'POST' && /\/users\/forgot-password/.test(r.url())) {
        posted = { url: r.url(), status: r.status() }
      }
    })
    await page
      .getByRole('button', { name: /send|reset|forgot|email/i })
      .first()
      .click()
    await expect(
      page.locator('text=/check your inbox|reset link|sent a reset/i').first(),
    ).toBeVisible({ timeout: 10000 })
    expect(posted, 'POST /users/forgot-password').toBeTruthy()
    expect(posted!.status).toBeLessThan(500)
  })
})
