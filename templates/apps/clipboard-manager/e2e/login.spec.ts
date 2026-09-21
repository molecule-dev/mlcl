/**
 * /login — POST /api/users/log-in. On 200 the JWT is persisted and the
 * user is sent to the requested origin (or /clips). Bad credentials
 * stay on the page and surface an error.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders email + password + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('valid credentials sign in and route to /clips', async ({ page }) => {
    const email = uniqueEmail('login-ok')
    const { password } = await signup(page, email)
    await login(page, email, password)
    await expect(page).toHaveURL(/\/clips/)
  })

  test('valid login fires POST /api/users/log-in (200)', async ({ page }) => {
    const email = uniqueEmail('login-net')
    const { password } = await signup(page, email)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill(password)
      await page.locator('form button[type="submit"]').click()
      await page.waitForURL(/\/clips/, { timeout: 20_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log[-_]?in/.test(r.url))
    expect(post).toBeTruthy()
    expect(post?.status).toBe(200)
  })

  test('invalid credentials surface an error and stay on /login', async ({ page }) => {
    // Expected 4xx: the failed log-in POST surfaces as a browser console
    // resource error; the inline error banner below is the real assertion.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(uniqueEmail('nope'))
    await page.locator('input#password').fill('definitely-wrong')
    await page.locator('form button[type="submit"]').click()
    // Deterministic: wait for the inline error, not a fixed timeout.
    await expect(page.locator('[data-mol-id="login-error"], [role="alert"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Forgot?" link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await page.waitForURL('**/forgot-password', { timeout: 10000 })
  })

  test('"Create an account" link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /create an account/i }).click()
    await page.waitForURL('**/signup', { timeout: 10000 })
  })

  test('show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const password = page.locator('input#password')
    await password.fill('TestPass!1234')
    expect(await password.getAttribute('type')).toBe('password')
    await page.getByRole('button', { name: /show password/i }).click()
    expect(await password.getAttribute('type')).toBe('text')
  })
})
