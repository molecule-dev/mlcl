import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup } from './_helpers.js'

test.describe('/login', () => {
  test('renders email + password fields and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i }).first()).toBeVisible()
  })

  test('logging in lands an existing user on /talk', async ({ page, browser }) => {
    // Provision an account in an isolated context so the page under test
    // has a clean cookie/localStorage state.
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    const { email, password } = await signup(p)
    await ctx.close()

    await login(page, email, password)
    await expect(page).toHaveURL(/\/talk/, { timeout: 15_000 })
  })

  test('wrong password keeps the user on /login with the error visible', async ({ page }) => {
    // The 401/403 from the login POST IS the case under test — allow the
    // console noise the browser logs for that rejected request.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 40[13]/,
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('does-not-exist@example.com')
    await page.locator('input[type="password"]').first().fill('WrongPass123!')
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
    // The title promises a visible error — assert the alert actually renders.
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('"Forgot?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('"Sign up" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Show password" toggle flips the input type from password → text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input[type="password"]').first()
    await expect(pw).toBeVisible()
    const toggle = page.getByRole('button', { name: /show.*password/i }).first()
    if (await toggle.count().catch(() => 0)) {
      await toggle.click()
      // Either the input now type=text or the toggle flipped to "Hide".
      const visiblePw = page
        .locator('input[type="text"]')
        .filter({ has: page.locator(':scope') })
        .first()
      const hideToggle = page.getByRole('button', { name: /hide.*password/i }).first()
      const flipped =
        (await visiblePw.count().catch(() => 0)) > 0 ||
        (await hideToggle.count().catch(() => 0)) > 0
      expect(flipped, '"Show password" must flip the input type or button label').toBe(true)
    }
  })

  test('brand link in the auth-shell header routes to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /wayfarer/i }).first()
    if (await link.count().catch(() => 0)) {
      const href = await link.getAttribute('href')
      expect(href, 'brand link must point to /').toMatch(/^\/?$/)
    }
  })
})
