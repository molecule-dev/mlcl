import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup } from './_helpers.js'

test.describe('/login', () => {
  test('renders Email Address + Password fields and Sign In button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/Email Address/i)).toBeVisible()
    await expect(page.getByLabel(/^Password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sign In$/i })).toBeVisible()
  })

  test('valid credentials POST to /api/users/log-in and land on /dashboard', async ({ page }) => {
    const { email, password } = await signup(page)
    // sign out by clearing localStorage; auth client recognises the missing token
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/Email Address/i).fill(email)
    await page.getByLabel(/^Password$/i).fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Sign In$/i }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const loginPost = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loginPost?.status).toBe(200)
  })

  test('invalid credentials surface an error and stay on /login', async ({ page }) => {
    // The rejected log-in 403s by design; the console error is expected.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/Email Address/i).fill('nonexistent@parcel.test')
    await page.getByLabel(/^Password$/i).fill('WrongPassword!')
    await page.getByRole('button', { name: /^Sign In$/i }).click()
    await page.waitForTimeout(2_000)
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByRole('alert').or(page.getByText(/invalid|incorrect|wrong|not found/i)),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('"Forgot password?" link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Sign Up" link in footer goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /^Sign Up$/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('login() helper round-trips an existing session', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
})
