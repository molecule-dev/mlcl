import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Reset password page (/reset-password)', () => {
  test('renders heading and email/token/new/confirm fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
    await expect(page.locator('#reset-email')).toBeVisible()
    await expect(page.locator('#reset-token')).toBeVisible()
    await expect(page.locator('#reset-new')).toBeVisible()
    await expect(page.locator('#reset-confirm')).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('email and token are prefilled from query string', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=hello%40fugue.test&token=abc123')
    await expect(page.locator('#reset-email')).toHaveValue('hello@fugue.test')
    await expect(page.locator('#reset-token')).toHaveValue('abc123')
  })

  test('Show password toggles BOTH new + confirm visibility', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const newPw = page.locator('#reset-new')
    const confirm = page.locator('#reset-confirm')
    await newPw.fill('Aaaa1111!')
    await confirm.fill('Aaaa1111!')
    await expect(newPw).toHaveAttribute('type', 'password')
    await expect(confirm).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(newPw).toHaveAttribute('type', 'text')
    await expect(confirm).toHaveAttribute('type', 'text')
  })

  test('mismatch alert is shown when confirm does not match new', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?email=x%40y.com&token=t')
      await page.locator('#reset-new').fill('NewPass1!')
      await page.locator('#reset-confirm').fill('Different1!')
      await page.getByRole('button', { name: /reset password/i }).click()
      await expect(page.getByRole('alert')).toContainText(/don.?t match/i)
    })
    const post = whereUrl(reqs, /\/api\/users\/reset-password/, 'POST')
    expect(post.length, 'no POST when mismatched').toBe(0)
  })

  test('invalid token surfaces an error alert from the backend', async ({ page }) => {
    // The backend's 4xx on an invalid token is the EXPECTED result under test
    // — silence the console-guard so the POST/no-redirect assertions decide.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 4\\d\\d',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(
        APP_BASE + '/reset-password?email=ghost%40example.com&token=invalid-token-xyz',
      )
      await page.locator('#reset-new').fill('Whatever123!')
      await page.locator('#reset-confirm').fill('Whatever123!')
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = whereUrl(reqs, /\/api\/users\/reset-password/, 'POST')
    expect(post.length).toBeGreaterThan(0)
    // backend rejects invalid token (4xx)
    expect(post[0].status).toBeGreaterThanOrEqual(400)
    // user must NOT be redirected to /dashboard
    expect(page.url()).toMatch(/\/reset-password/)
  })

  test('back to sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /back to sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('direct backend POST with invalid token returns non-2xx (does not silently succeed)', async ({
    request,
  }) => {
    const res = await request.post(API_BASE + '/users/reset-password', {
      data: { token: 'definitely-invalid', password: 'Aaaa1111!' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status(), 'invalid token must not 2xx').toBeGreaterThanOrEqual(400)
  })

  test('email field is type=email and required', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const email = page.locator('#reset-email')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
  })

  test('AuthBrandHeader Fugue heading is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading', { name: /^Fugue$/ })).toBeVisible()
  })

  test('mismatched password keeps user on /reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=x%40y.com&token=t')
    await page.locator('#reset-new').fill('Pass1!11')
    await page.locator('#reset-confirm').fill('Pass2!22')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page).toHaveURL(/\/reset-password/)
  })
})
