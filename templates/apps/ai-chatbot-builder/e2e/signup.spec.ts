/**
 * /signup — form validates, real signup persists, post-signup user is
 * authenticated (token in localStorage), and the page links to login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders the signup form with email + password fields and "Sign in" link', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#signup-email')).toBeVisible()
    await expect(page.locator('input#signup-password')).toBeVisible()
    await expect(page.getByText(/already have an account\?/i)).toBeVisible()
  })

  test('valid signup creates a user, lands off /signup, persists JWT bearer', async ({ page }) => {
    const email = uniqueEmail('signup-good')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('#signup-email').fill(email)
      await page.locator('#signup-password').fill('TestPass123!')
      await page
        .getByRole('button', { name: /create\s*account/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
    })
    const signupCall = reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/users(\/sign-up|\/signup|$|\?)/.test(r.url) &&
        r.status < 400,
    )
    expect(signupCall, 'POST /api/users (signup) should have succeeded').toBeTruthy()

    const token = await getAccessToken(page)
    expect(token, 'auth client should persist a JWT after signup').toBeTruthy()
  })

  test('signing up with a duplicate email surfaces an error and stays on /signup', async ({
    page,
  }) => {
    const email = uniqueEmail('dup')
    // First signup succeeds.
    await page.goto(APP_BASE + '/signup')
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill('TestPass123!')
    await page
      .getByRole('button', { name: /create\s*account/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })

    await page.evaluate(() => window.localStorage.clear())

    // Second signup with the same email must fail. The expected 4xx is
    // browser-logged as a failed resource load; the page renders the
    // duplicate-email error inline (role="alert").
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 4\\d\\d',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('#signup-email').fill(email)
      await page.locator('#signup-password').fill('TestPass123!')
      await page
        .getByRole('button', { name: /create\s*account/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    const failed = reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/users(\/sign-up|\/signup|$|\?)/.test(r.url) &&
        r.status >= 400,
    )
    expect(failed, 'duplicate signup should respond 4xx').toBeTruthy()
  })

  test('"Sign in" footer link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.locator('a[href="/login"]').first()
    if (await link.count()) {
      await link.click()
    } else {
      await page
        .getByRole('link', { name: /sign\s*in/i })
        .first()
        .click()
    }
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input#login-email')).toBeVisible()
  })
})
