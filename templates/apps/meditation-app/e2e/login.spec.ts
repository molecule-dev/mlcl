/**
 * /login — credentials. Asserts form render, success path (POST /api/login →
 * /home), failure path (stays on /login), and link reachability.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup } from './_helpers.js'

test.describe('login', () => {
  test('renders email + password inputs and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('signs in with valid credentials and lands on /home', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).toHaveURL(/\/home/)
    const loginCalls = reqs.filter((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(
      loginCalls.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)
    expect(loginCalls[0].status).toBeLessThan(400)
  })

  test('rejects bad credentials and stays on /login', async ({ page }) => {
    // The 403 from the failed log-in is the expected rejection the test asserts.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input[type="email"]').fill('nobody@meditation.test')
      await page.locator('input[type="password"]').fill('wrong-password')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(2000)
    })
    await expect(page).toHaveURL(/\/login/)
    const loginCalls = reqs.filter((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(
      loginCalls.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)
    expect(loginCalls[0].status).toBeGreaterThanOrEqual(400)
  })

  test('forgot-password and signup links are reachable from /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
    await page.goto(APP_BASE + '/login')
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: /create an account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })
})
