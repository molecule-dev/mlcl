import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup page', () => {
  test('Name textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.locator('input[type="text"], input:not([type])').first()
    await name.fill('Test Runner')
    expect(await name.inputValue()).toBe('Test Runner')
  })

  test('Email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input[type="email"]').first()
    await email.fill('demo@example.com')
    expect(await email.inputValue()).toBe('demo@example.com')
  })

  test('Password textbox stays masked', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('hunter2')
    expect(await pw.inputValue()).toBe('hunter2')
    expect(await pw.getAttribute('type')).toBe('password')
  })

  test('Sign up creates a user and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-ok')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass!1234')
    })
    const create = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$|\/)/.test(r.url))
    expect(create, 'POST /api/users').toBeTruthy()
    expect(create?.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('Log in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })
})
