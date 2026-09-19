/**
 * Login: an existing user signs in, lands on /dashboard, and the session
 * survives a reload (read-after-write contract). Wrong credentials do
 * not redirect away from /login.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test('existing user can log in and session persists across reload', async ({ page, browser }) => {
  const email = uniqueEmail('login')
  const password = 'password123'

  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, password)
  await ctx.close()

  await login(page, email, password)
  await expect(page).toHaveURL(/\/dashboard/)

  await page.reload()
  await expect(page).toHaveURL(/\/dashboard/)
})

test('wrong password keeps user on /login', async ({ page, browser }) => {
  const email = uniqueEmail('login')
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, 'password123')
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill('wrong-password!!!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/\/login/)
})

test('protected route redirects to /login when signed out', async ({ page }) => {
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForURL(/\/(login|signup|$)/, { timeout: 10_000 })
  expect(page.url()).toMatch(/\/(login|signup)|\/$/)
})

test('login submit POSTs the auth endpoint and stores the access token', async ({
  page,
  browser,
}) => {
  const email = uniqueEmail('login')
  const password = 'password123'
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, password)
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  })
  const sessionPost = reqs.find(
    (r) =>
      r.method === 'POST' &&
      /\/api\/(sessions|users\/log[\-_]?in|auth\/(login|signin))/i.test(r.url),
  )
  expect(sessionPost, JSON.stringify(reqs)).toBeTruthy()
  expect(sessionPost!.status).toBeLessThan(400)
  const token = await getAccessToken(page)
  expect(token).toBeTruthy()
})

test('forgot password link navigates to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /forgot password/i }).click()
  await page.waitForURL(/\/forgot-password/, { timeout: 10_000 })
})

test('signup link navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /start your library/i }).click()
  await page.waitForURL(/\/signup/, { timeout: 10_000 })
})

test('theme toggle changes <html data-mol-mode> AND persists across reload', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const toggle = page.getByRole('button', { name: /toggle theme/i })
  await expect(toggle).toBeVisible()
  const readState = () =>
    page.evaluate(() => ({
      mode: document.documentElement.getAttribute('data-mol-mode'),
      theme: document.documentElement.getAttribute('data-mol-theme'),
      stored: window.localStorage.getItem('molecule-theme'),
    }))
  const before = await readState()
  expect(before.mode, 'theme provider not wired').toBeTruthy()
  await toggle.click()
  await page.waitForTimeout(300)
  const after = await readState()
  expect(after.mode, `mode did not change from ${before.mode}`).not.toBe(before.mode)
  expect(after.stored, 'theme name not persisted to localStorage').toBeTruthy()
  await page.reload()
  await page.waitForTimeout(300)
  const persisted = await readState()
  expect(persisted.mode, 'theme did not persist across reload').toBe(after.mode)
})
