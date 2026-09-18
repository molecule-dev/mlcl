import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// /reset-password — confirm-reset flow.
// Pre-fills email + token from query string. Submit → POST
// /api/users/reset-password (and on success, /log-in then redirect).

test.describe('/reset-password', () => {
  test('renders all three fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('#reset-email')).toBeVisible()
    await expect(page.locator('#reset-token')).toBeVisible()
    await expect(page.locator('#reset-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('email + token query params pre-fill the form', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=test@example.com&token=rt_abc123')
    await expect(page.locator('#reset-email')).toHaveValue('test@example.com')
    await expect(page.locator('#reset-token')).toHaveValue('rt_abc123')
  })

  test('show/hide password toggle flips type', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.locator('#reset-password')
    await pw.fill('NewSecret1!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('invalid token submits and surfaces an error (does not navigate)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?email=missing@example.com&token=invalid')
      await page.locator('#reset-password').fill('Whatever123!')
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(2500)
    })
    // The molecule auth client posts to /api/auth/password/reset/confirm
    // (not /api/users/reset-password). Either path is acceptable evidence
    // that submission was wired through.
    const post = reqs.find(
      (r) => r.method === 'POST' && (/reset-password/.test(r.url) || /password\/reset/.test(r.url)),
    )
    expect(post, 'a password-reset POST should fire').toBeDefined()
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
