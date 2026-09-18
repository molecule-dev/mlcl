import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// /reset-password — token + new password form. Token can come from
// query param. We can verify the form renders and submits the password
// reset endpoint without a real token (server returns 4xx → UI shows
// error).

test.describe('/reset-password', () => {
  test('renders token, password and confirm fields and submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('textbox', { name: /reset code/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /new password/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /confirm password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password|save/i })).toBeVisible()
  })

  test('mismatched passwords show inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=test@example.com')
    await page.getByRole('textbox', { name: /reset code/i }).fill('not-a-real-token')
    await page.getByRole('textbox', { name: /new password/i }).fill('NewPass1!')
    await page.getByRole('textbox', { name: /confirm password/i }).fill('Different2!')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText(/do not match|don.t match/i)).toBeVisible()
  })

  test('invalid token: POST hits /api/users/reset-password and returns 4xx', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=test@example.com')
    await page.getByRole('textbox', { name: /reset code/i }).fill('not-a-real-token')
    await page.getByRole('textbox', { name: /new password/i }).fill('NewPass1!')
    await page.getByRole('textbox', { name: /confirm password/i }).fill('NewPass1!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(1500)
    })
    // The route MUST exist. Past template versions silently 404'd because
    // the per-app router didn't mount /users/reset-password — locking
    // every user out post-email-click.
    const resetCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url),
    )
    expect(resetCall, 'POST /api/users/reset-password should fire').toBeDefined()
    expect(resetCall!.status).not.toBe(404)
    expect(resetCall!.status).toBeGreaterThanOrEqual(400)
    expect(resetCall!.status).toBeLessThan(500)
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('"Back to sign in" link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /back to sign in|sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
