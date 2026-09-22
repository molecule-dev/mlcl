import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signupAndToken, uniqueEmail } from './_helpers'

test.describe('/signup', () => {
  test('happy path — creates user, returns token, lands on /dashboard', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signupAndToken(page)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\b/.test(r.url))
    expect(post, '/api/users POST must fire').toBeDefined()
    expect(post!.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('mismatched passwords keeps the submit button disabled', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#firstName').fill('Test')
    await page.locator('input#lastName').fill('User')
    await page.locator('input#email').fill(uniqueEmail())
    await page.locator('input#password').fill('one-password-123')
    await page.locator('input#confirmPassword').fill('a-different-pw-456')
    // The form disables the submit button when the two password fields
    // don't match — that's the intended UX, so we assert the disabled
    // state and that the URL stays on /signup instead of trying to click.
    const submit = page.getByRole('button', { name: /create account/i })
    await expect(submit).toBeDisabled()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('duplicate email surfaces a server-side error', async ({ page }) => {
    const { email, password } = await signupAndToken(page)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#firstName').fill('Dup')
    await page.locator('input#lastName').fill('Cate')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('input#confirmPassword').fill(password)
    // A duplicate signup is SUPPOSED to 4xx — the browser logs the failed
    // resource and the console-guard would fail the test without this.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 40[39]',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create account/i }).click()
      await page.waitForTimeout(1500)
    })
    await expect(page).toHaveURL(/\/signup/)
    const dup = reqs.find((r) => r.method === 'POST' && /\/api\/users\b/.test(r.url))
    expect(dup, '/api/users POST must fire on duplicate').toBeDefined()
    expect(dup!.status, 'duplicate signup must return non-2xx').toBeGreaterThanOrEqual(400)
  })

  test('"sign in" link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
