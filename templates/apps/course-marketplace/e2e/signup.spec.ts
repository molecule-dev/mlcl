/**
 * /signup — new account creation via the visible form.
 *
 * Asserts: the form posts to /api/users, the JWT bearer is persisted,
 * the user lands off /signup, and a duplicate email cannot register
 * twice.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders name + email + password fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('[data-mol-id="btn-signup"]')).toBeVisible()
  })

  test('valid signup persists JWT and lands off /signup', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('signup-ok'))
    expect(accessToken, 'JWT bearer should be persisted in localStorage').toBeTruthy()
    expect(userId, 'user id should be persisted in localStorage').toBeTruthy()
    // signup() already gated on register POST + URL leaving /signup; just
    // assert the post-signup destination explicitly.
    await expect(page).not.toHaveURL(/\/signup/)
  })

  test('signup POSTs /api/users (network)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page, uniqueEmail('signup-network'))
    })
    const r = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(r, 'signup must POST /api/users').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('duplicate email cannot register twice', async ({ page }) => {
    const email = uniqueEmail('signup-dup')
    const password = 'TestPass123!'
    // The duplicate register POST is EXPECTED to fail with 403 ("Email is
    // already registered.") — the page renders it inline. Allow that one
    // console resource error before it fires.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    // Pre-create the account via API.
    await page.request.post(`${API_BASE}/users`, {
      data: { name: 'Dup User', email, password },
      failOnStatusCode: false,
    })
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('[data-mol-id="btn-signup"]')).toBeEnabled()
    await page.locator('#name').fill('Dup Two')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('input[type="checkbox"]').first().check()
    // Wait for the duplicate-register POST to settle, then assert the URL
    // never moved off /signup. Auto-retrying assertion handles whatever
    // microtask order React takes to render the error.
    const dupResponse = page.waitForResponse(
      (res) => /\/api\/users(\?|$)/.test(res.url()) && res.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="btn-signup"]').click()
    await dupResponse
    await expect(page).toHaveURL(/\/signup/)
  })

  test('terms checkbox is required to submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('[data-mol-id="btn-signup"]')).toBeEnabled()
    await page.locator('#name').fill('No Agree')
    await page.locator('#email').fill(uniqueEmail('no-agree'))
    await page.locator('#password').fill('TestPass123!')
    // Don't tick the checkbox — submit should surface the agreement error.
    await page.locator('[data-mol-id="btn-signup"]').click()
    // No network request fires (client-side guard), so just retry-poll the
    // error element directly.
    await expect(page.locator('[data-mol-id="signup-error"]')).toBeVisible({ timeout: 5_000 })
  })
})
