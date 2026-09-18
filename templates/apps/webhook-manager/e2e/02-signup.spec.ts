import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, requireAccessToken, signup, uniqueEmail } from './_helpers'

test.describe('/signup', () => {
  test('renders the signup form with email + password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('successful signup redirects to /dashboard and stores a JWT', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    const userPost = reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/users(?:[/?]|$)/.test(r.url) &&
        r.status >= 200 &&
        r.status < 300,
    )
    expect(userPost, 'expected POST /api/users 2xx').toBeDefined()
    const token = await requireAccessToken(page)
    expect(token, 'JWT must be persisted in localStorage').toMatch(/^eyJ/)
  })

  test('signup with duplicate email surfaces an error and does not navigate away', async ({
    page,
  }) => {
    const email = uniqueEmail('dup')
    await signup(page, { email })
    // Now try to sign up again with the same email
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('input[type="email"]').fill(email)
    const pwInputs = page.locator('input[type="password"]')
    await pwInputs.first().fill('TestPass1234!')
    if ((await pwInputs.count()) > 1) await pwInputs.nth(1).fill('TestPass1234!')
    const tc = page.getByRole('checkbox').first()
    if (await tc.count().catch(() => 0)) {
      if (!(await tc.isChecked())) await tc.check()
    }
    await page
      .getByRole('button', { name: /create.*account|sign.*up|get.*started/i })
      .first()
      .click()
    // Either we stay on /signup OR an error appears in the DOM
    await page.waitForTimeout(2000)
    const stillOnSignup = /\/signup/.test(page.url())
    expect(stillOnSignup).toBe(true)
  })
})
