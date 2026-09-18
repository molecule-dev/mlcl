import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a real user that can authenticate next request', async ({ page }) => {
    const { email } = await signup(page)
    // Authenticated GET works. The user resource handler wraps the row
    // under `props` (per @molecule/api-resource-user); accept either the
    // wrapped or a flattened shape so this test isn't tied to the wrapper
    // convention.
    const me = await apiGet<{ props?: { email?: string }; email?: string }>(
      page,
      '/users/me',
    ).catch(() => null)
    if (me) {
      const meEmail = me.email ?? me.props?.email
      expect(meEmail).toBe(email)
    }
    // Token landed in cookie.
    const token = await getAccessToken(page)
    expect(token, 'JWT must be persisted to auth cookie').toBeTruthy()
    expect(token!.split('.').length, 'token must look like a JWT').toBe(3)
  })

  test('signup persists across page.reload (session survives refresh)', async ({ page }) => {
    await signup(page)
    await expect(page).not.toHaveURL(/\/signup|\/login/)
    const tokenBefore = await getAccessToken(page)
    await page.reload()
    const tokenAfter = await getAccessToken(page)
    expect(tokenAfter).toBe(tokenBefore)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('login with the right password lands the user inside the app', async ({ page }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)
    // Clear and log back in.
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('login with the wrong password is rejected and stays on /login', async ({ page }) => {
    const email = uniqueEmail('badlogin')
    await signup(page, email, 'TestPass123!')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TotallyWrong!')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('signup with an already-used email fails (uniqueness invariant)', async ({ page }) => {
    const email = uniqueEmail('dupe')
    await signup(page, email)
    // [M1-1] Log out completely before the duplicate-signup attempt. The JWT
    // lives in an httpOnly `token` cookie (no longer localStorage), so
    // clearing localStorage alone leaves the first signup's cookie in place —
    // and `getAccessToken` would then read that stale token, masking whether
    // the duplicate signup (which the server rejects with 403, issuing no new
    // cookie) actually failed.
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const firstName = page.locator('input[autocomplete="given-name"]').first()
    if (await firstName.count().catch(() => 0)) await firstName.fill('Dupe')
    const lastName = page.locator('input[autocomplete="family-name"]').first()
    if (await lastName.count().catch(() => 0)) await lastName.fill('Test')
    await page.locator('input[type="email"]').first().fill(email)
    const passwordInputs = page.locator('input[type="password"]')
    const passwordCount = await passwordInputs.count()
    await passwordInputs.first().fill('TestPass123!')
    if (passwordCount > 1) await passwordInputs.nth(1).fill('TestPass123!')
    const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
    if (await terms.count().catch(() => 0)) await terms.check()
    await page
      .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    const token = await getAccessToken(page)
    expect(token, 'duplicate signup must not issue a fresh JWT').toBeFalsy()
  })
})
