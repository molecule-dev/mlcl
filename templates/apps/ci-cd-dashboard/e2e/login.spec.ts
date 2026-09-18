import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, whereUrl } from './_helpers.js'

test.describe('/login', () => {
  test('renders email + password + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/^Email$/i)).toBeVisible()
    await expect(page.getByLabel(/^Password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible()
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/^Email$/i).fill('user@example.com')
    await expect(page.getByLabel(/^Email$/i)).toHaveValue('user@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/^Password$/i).fill('Secret123!')
    await expect(page.getByLabel(/^Password$/i)).toHaveValue('Secret123!')
  })

  test('show password toggle exposes password text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/^Password$/i)
    await pw.fill('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    const showBtn = page.getByRole('button', { name: /Show password/i })
    if (await showBtn.count()) {
      await showBtn.click()
      await expect(pw).toHaveAttribute('type', 'text')
    }
  })

  test('forgot link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('signup link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Sign up free/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('valid credentials log in and redirect to /pipelines', async ({ page }) => {
    const user = await signup(page)
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await login(page, user.email, user.password)
    })
    const loginPost = whereUrl(reqs, /\/api\/users\/log-in/, 'POST')
    expect(loginPost.length, 'POST /api/users/log-in fired').toBeGreaterThan(0)
    expect(loginPost[0].status, 'login must succeed').toBe(200)
    await expect(page).toHaveURL(/\/pipelines/)
  })

  test('invalid credentials stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/^Email$/i).fill('nobody-' + Date.now() + '@example.com')
    await page.getByLabel(/^Password$/i).fill('WrongPass123!')
    await page.getByRole('button', { name: /^Sign in$/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })
})
