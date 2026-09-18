import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /login: email + password fields and the submit button. Real auth check
// uses signup() to mint a real account (so we never assume anything about
// pre-seeded users), then logs out and re-logs in via the form.

test.describe('/login', () => {
  test('email + password inputs are editable', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('textbox', { name: /email/i }).fill('a@b.co')
    await page.getByRole('textbox', { name: /^password$/i }).fill('Pw1234567!')
    await expect(page.getByRole('textbox', { name: /email/i })).toHaveValue('a@b.co')
    await expect(page.getByRole('textbox', { name: /^password$/i })).toHaveValue('Pw1234567!')
  })

  test('login form fires POST /api/users/log-in and routes to /docs on success', async ({
    page,
    context,
  }) => {
    const creds = await signup(page)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.getByRole('textbox', { name: /email/i }).fill(creds.email)
    await page.getByRole('textbox', { name: /^password$/i }).fill(creds.password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /sign\s*in/i }).click()
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 })
    })
    const loginPost = reqs.find((r) => /\/api\/users\/log-in\b/.test(r.url) && r.method === 'POST')
    expect(loginPost, 'POST /api/users/log-in should fire on login submit').toBeTruthy()
    expect(loginPost!.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/(docs|$)/)
  })

  test('show/hide password toggles input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByRole('textbox', { name: /^password$/i })
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    // After toggle, the password input becomes type=text — re-locate by id since
    // role-textbox no longer matches when masked is off.
    await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  })
})
