import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { login, signup, uniqueEmail } from './_helpers.js'

test.describe('Auth flows', () => {
  test('signup → land authenticated, log out → log back in', async ({ page }) => {
    const { email, password } = await signup(page)

    // After signup we should be authenticated. Visit settings (an
    // AuthGuard'd route); a 302 → /login would mean signup didn't
    // actually log us in.
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10_000 })

    // Now log out by clearing client state (sidebar logout flow varies
    // by skin); then re-login via the form to verify password persisted.
    // [M1-1] The persistent session is the httpOnly `token` cookie (+
    // `mol_auth` hint), NOT localStorage — clearing storage alone leaves
    // the session restorable, so we must drop cookies too to truly sign
    // out.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await login(page, email, password)
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10_000 })
  })

  test('signup with existing email is rejected', async ({ page }) => {
    const email = uniqueEmail('dupe')
    await signup(page, { email })

    // Second attempt with the same email should NOT navigate away from
    // /signup and should surface an error (or simply not create a new
    // session). The spec passes as long as we don't end up on the
    // post-signup landing.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto('/signup')
    const inputs = page.locator('input').filter({ visible: true })
    await inputs.nth(0).fill('Dupe')
    await inputs.nth(1).fill('Tester')
    await inputs.nth(2).fill(email)
    await inputs.nth(3).fill('TestPass123!')
    await inputs.nth(4).fill('TestPass123!')
    // The duplicate POST /api/users is REJECTED with a 403 — the browser
    // logs it to console and the inline form error surfaces instead. The
    // console-guard fixture fails any test whose page console.errors, so
    // declare this expected 4xx BEFORE the click fires it.
    await test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page
      .getByRole('button', { name: /create account|sign\s*up|register/i })
      .first()
      .click()
    // Either we stay on /signup or go back to /login — anything but a
    // freshly-authenticated /admin or / is fine.
    await page.waitForTimeout(2_000)
    const url = page.url()
    expect(url).not.toMatch(/\/admin/)
  })
})
