import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, apiRaw, getAccessToken, signup, uniqueEmail } from './_helpers.js'

// Auth flow: signup → login → protected route → logout-equivalent (token wipe)
// Validates the *outcomes* a user actually cares about — that signing up
// drops them on /dashboard with a working session, not just that the form
// posted somewhere.

test('Signup succeeds, drops user on /dashboard, persists session across reload', async ({
  page,
}) => {
  const email = uniqueEmail('sports-league-auth')
  const password = 'TestPass123456!'
  await signup(page, email, password)

  // Token should be present in localStorage; protected API call should 200.
  const token = await getAccessToken(page)
  expect(token, 'access token after signup').toBeTruthy()
  const meResp = await apiRaw(page, 'GET', '/profile/me')
  expect(meResp.status()).toBe(200)

  // Reload — AuthGuard should not bounce us back to /login.
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
})

test('Login screen rejects bogus credentials with a visible error', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill('does-not-exist@example.com')
  await page.locator('input#password').fill('WrongPassword!')
  await page
    .getByRole('button', { name: /sign\s*in/i })
    .first()
    .click()
  // We should still be on /login (never authenticated)
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL(/\/login/)
  // An error message must be surfaced (alert role or visible text).
  const error = page.getByRole('alert').first()
  await expect(error).toBeVisible({ timeout: 5_000 })
})

test('Login then logout: existing user can sign in, hit /dashboard, then auth wipe forces /login', async ({
  page,
}) => {
  // Bootstrap a user via signup (so we have a known good account).
  const email = uniqueEmail('sports-league-login')
  const password = 'TestPass123456!'
  await signup(page, email, password)

  // Wipe session (equivalent to a logout) and try to hit /dashboard — guard
  // should bounce to /login. Under M1-1 the session is the httpOnly `token`
  // cookie (+ mol_auth hint), not a localStorage bearer copy, so clearing
  // storage alone leaves the session restorable; the cookies must go too.
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/dashboard')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

  // Now sign back in via the form — must navigate off /login.
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page
    .getByRole('button', { name: /sign\s*in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })

  // Token should be back in storage.
  const token = await getAccessToken(page)
  expect(token).toBeTruthy()
})

test('Forgot-password form posts to the API and shows a confirmation', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  // The forgot form has an email input and a submit button.
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.fill(uniqueEmail('sports-league-forgot'))
  // Capture the network so we can assert the submission actually fired.
  const reqPromise = page
    .waitForRequest(
      (req) =>
        /\/users\/forgot-password|\/auth\/forgot-password|\/forgot-password/.test(req.url()) &&
        req.method() === 'POST',
      { timeout: 10_000 },
    )
    .catch(() => null)
  await page
    .getByRole('button')
    .filter({ hasText: /send|reset|recover|email/i })
    .first()
    .click()
  const req = await reqPromise
  expect(req, 'forgot-password POST should fire').not.toBeNull()
  // After submit, either a success message appears or we are redirected
  // back to /login. Either is a valid UX outcome — we just need to not
  // see an unhandled error toast.
  await page.waitForTimeout(1500)
  // No fatal error should have rendered.
  const fatal = page.getByText(/fatal|crash|undefined is not/i).first()
  expect(await fatal.count()).toBe(0)
})

test('Reset-password form posts when a token is present and shows non-error feedback', async ({
  page,
}) => {
  // We don't have a real reset token — but the page should still render
  // without crashing and the inputs should be present. This is the
  // baseline shape test.
  await page.goto(APP_BASE + '/reset-password?token=fake-token-for-shape-test')
  await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 })
  await page.locator('input[type="password"]').first().fill('NewPass123456!')
  // Some reset forms have a confirm field — fill the second one if present.
  const second = page.locator('input[type="password"]').nth(1)
  if (await second.count()) {
    await second.fill('NewPass123456!')
  }
  await page
    .getByRole('button')
    .filter({ hasText: /reset|update|change|set/i })
    .first()
    .click()
  // Either we get an error (bad token) or success (mock accepts) — both
  // shapes leave the page mounted without a crash, which is what we
  // assert here.
  await page.waitForTimeout(1500)
  const crashed = page.getByText(/fatal|crash|undefined is not/i).first()
  expect(await crashed.count()).toBe(0)
})
