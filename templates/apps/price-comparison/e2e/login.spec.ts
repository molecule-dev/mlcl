import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill('test@example.com')
    await expect(page.locator('#email')).toHaveValue('test@example.com')
  })

  test('password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#password').fill('TestPass123!')
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  })

  test('valid login redirects off /login', async ({ page }) => {
    const email = uniqueEmail('login-ok')
    const { password } = await signup(page, email)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    const post = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(post?.status).toBe(200)
  })

  test('"Sign up" footer link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /sign\s*up|create.*account/i }).first()
    // Mid-hydration clicks on a React Router <Link> are swallowed — see the same
    // fix in forgot-password.spec.ts. Retry the click until navigation happens.
    await expect(async () => {
      await link.click()
      await expect(page).toHaveURL(/\/signup/, { timeout: 2000 })
    }).toPass({ timeout: 15000 })
  })

  test('"Forgot password" link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot.*password/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})
