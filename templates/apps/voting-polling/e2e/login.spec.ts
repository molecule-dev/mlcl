import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers.js'

test('Login form renders email + password + submit + forgot link + signup link', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign\s*in/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible()
  // The signup CTA on the login page links to /signup. The label text
  // varies by app branding ("Start a free poll" for voting-polling) so
  // we anchor on the href rather than the visible text.
  const signupLink = page.locator('a[href="/signup"]').first()
  await expect(signupLink).toBeVisible()
})

test('Login with correct credentials sets token and routes to /dashboard', async ({ page }) => {
  const { email, password } = await signup(page)
  // [M1-1] The bearer token now lives in memory + an httpOnly cookie, not
  // localStorage — so a localStorage.clear() alone leaves the session intact.
  // Clear cookies too to genuinely log the user out before the login round-trip.
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()
  expect(await getAccessToken(page)).toBeNull()
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.getByRole('button', { name: /sign\s*in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  })
  const logIn = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
  expect(logIn?.status).toBeLessThan(300)
  expect(await getAccessToken(page)).not.toBeNull()
})

test('Login with wrong password shows error and stays on /login', async ({ page }) => {
  // The wrong-password attempt legitimately answers 403 and the browser
  // logs the failed resource load — expected here, not a console bug.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 403',
  })
  const { email } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill('WRONGwrong0000!')
  await page.getByRole('button', { name: /sign\s*in/i }).click()
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('alert')).toBeVisible()
})

test('Forgot password link routes to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /forgot/i }).click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('Visiting a protected route (/dashboard) while logged out redirects to /login', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/dashboard')
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
})
