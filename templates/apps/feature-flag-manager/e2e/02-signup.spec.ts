import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

// /signup — POST /api/users → JWT issued → redirect to /dashboard.

test.describe('/signup', () => {
  test('renders fields without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#signup-email')).toBeVisible()
    await expect(page.locator('#signup-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /create workspace/i })).toBeVisible()
  })

  test('creating an account POSTs /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('#signup-email').fill(email)
      await page.locator('#signup-password').fill('TestPass1234!')
      await page.getByRole('button', { name: /create workspace/i }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const usersPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\?|$)/.test(r.url))
    expect(usersPost, 'POST /api/users should fire on signup').toBeDefined()
    expect(usersPost!.status, 'signup POST should be 2xx').toBeLessThan(300)
  })

  test('"Sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('show/hide password toggle flips the input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('#signup-password')
    await pw.fill('SuperSecret1!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('email field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('#signup-email')
    await email.fill('walker@example.com')
    await expect(email).toHaveValue('walker@example.com')
  })
})
