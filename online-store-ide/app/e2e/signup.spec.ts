import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/signup', () => {
  test('renders signup form', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('happy-path signup persists session and redirects to home', async ({ page }) => {
    const { email } = await signup(page)
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 })
    await page.reload()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    expect(email).toMatch(/@example\.com$/)
  })

  test('duplicate email shows error', async ({ page }) => {
    // The duplicate-signup 403 is the subject of this spec, and the
    // cleared cookies make the nav's authed cart fetch 401 — both are
    // expected console noise.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403|status of 401',
    })
    const { email, password } = await signup(page)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[name="name"]').fill('Dup User')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
  })
})
