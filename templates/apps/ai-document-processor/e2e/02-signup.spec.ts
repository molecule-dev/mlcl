import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

test.describe('/signup', () => {
  test('renders fields without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /create.*account|sign.*up/i })).toBeVisible()
  })

  test('submitting fires POST /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      // Wait for the form to mount before counting. count() is a one-shot read
      // with no auto-waiting, so it can run against a still-empty React root,
      // return 0, and silently skip the fill below — the form then will not
      // submit and the failure surfaces as a missing request, not a missing field.
      await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
      const nameInput = page.locator('input[placeholder*="address"]').first()
      if (await nameInput.count().catch(() => 0)) {
        await nameInput.fill('Signup Test')
      }
      await page.locator('input[type="email"]').fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass1234!')
      await page
        .getByRole('button', { name: /create.*account|sign.*up/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const usersPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\?|$)/.test(r.url))
    expect(usersPost, 'POST /api/users should fire on signup').toBeDefined()
    expect(usersPost!.status, 'signup POST should be 2xx').toBeLessThan(300)
  })

  test('"Sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('email field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input[type="email"]')
    await email.fill('walker@example.com')
    await expect(email).toHaveValue('walker@example.com')
  })

  test('signup unique-email invariant: same email twice → second is rejected', async ({ page }) => {
    const email = uniqueEmail('uniq')
    // First signup succeeds
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const nameInput = page.locator('input[placeholder*="address"]').first()
    if (await nameInput.count().catch(() => 0)) await nameInput.fill('Twin')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass1234!')
    await page
      .getByRole('button', { name: /create.*account|sign.*up/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })

    // Same email retry should not result in /dashboard.
    // Wipe local auth so the retry uses a fresh /signup.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    if (await nameInput.count().catch(() => 0)) await nameInput.fill('Twin')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass1234!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /create.*account|sign.*up/i })
        .first()
        .click()
      // Wait for the duplicate POST to complete; either we stay on /signup
      // (preferred) or the backend returns 4xx.
      await page.waitForTimeout(2_000)
    })
    const dup = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\?|$)/.test(r.url))
    expect(dup, 'duplicate signup POST should fire').toBeDefined()
    expect(
      dup!.status,
      'duplicate email signup should be rejected with 4xx',
    ).toBeGreaterThanOrEqual(400)
  })
})
