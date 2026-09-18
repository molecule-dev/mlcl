import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('first-name field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByPlaceholder('Aria')
    await tb.fill('Test')
    await expect(tb).toHaveValue('Test')
  })

  test('last-name field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByPlaceholder('Lin')
    await tb.fill('User')
    await expect(tb).toHaveValue('User')
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/Email address/i)
    await tb.fill('user@example.com')
    await expect(tb).toHaveValue('user@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/^Password$/i)
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('confirm-password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/Confirm password/i)
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('"Create account" submits and lands user on /dashboard, also fires /api/bootstrap', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('signup-spec')
    await page.getByPlaceholder('Aria').fill('Test')
    await page.getByPlaceholder('Lin').fill('User')
    await page.getByLabel(/Email address/i).fill(email)
    await page.getByLabel(/^Password$/i).fill('TestPass123!')
    await page.getByLabel(/Confirm password/i).fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForURL((u) => !u.pathname.includes('/signup'), { timeout: 15000 })
      // Allow the bootstrap call (fired by AuthGuard after the auth redirect) to fly.
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    expect(page.url()).toMatch(/\/dashboard/)
    expect(reqs.some((r) => /\/api\/users/.test(r.url) && r.method === 'POST')).toBeTruthy()
    expect(reqs.some((r) => /\/api\/bootstrap/.test(r.url) && r.method === 'POST')).toBeTruthy()
  })

  test('"Sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Back to home" link goes to /', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Back to home/i }).click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })
})
