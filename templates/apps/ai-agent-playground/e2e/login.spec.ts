import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, whereUrl } from './_helpers.js'

test.describe('Login page', () => {
  test('renders Neuron heading + email/password fields + submit + recover link', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading', { name: /^Neuron$/ })).toBeVisible()
    await expect(page.locator('[data-mol-id="login-email"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="login-password"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="login-submit"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /recover\?|forgot/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /start building|sign\s*up/i })).toBeVisible()
  })

  test('submits POST /api/users/log-in and lands on /dashboard', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="login-email"]').fill(session.email)
      await page.locator('[data-mol-id="login-password"]').fill(session.password)
      await page.locator('[data-mol-id="login-submit"]').click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    const loginPost = whereUrl(reqs, /\/api\/users\/log-in/, 'POST')
    expect(loginPost.length, 'POST /api/users/log-in should fire').toBeGreaterThan(0)
    expect(loginPost[0].status, 'login endpoint must succeed').toBeLessThan(300)
  })

  test('shows error message on bad credentials, stays on /login', async ({ page }) => {
    // The backend correctly answers 403 for bad credentials; the browser
    // always logs failed fetches to the console, so allow that exact noise.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('[data-mol-id="login-email"]').fill('nobody@example.com')
    await page.locator('[data-mol-id="login-password"]').fill('not-the-password')
    await page.locator('[data-mol-id="login-submit"]').click()
    await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('login helper round-trip lands on dashboard', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/login')
    await login(page, session.email, session.password)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('"Recover?" link points to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /recover\?|forgot/i })
    await expect(link).toHaveAttribute('href', /\/forgot-password/)
  })

  test('"Start building" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /start building|sign\s*up/i }).click()
    await expect(page).toHaveURL(/\/signup$/, { timeout: 10000 })
  })
})
