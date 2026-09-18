import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup page', () => {
  test('Email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="email"]').first().fill('typed@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('typed@example.com')
  })

  test('Password textbox accepts input and stays masked', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('TestPass!1234')
    expect(await pw.inputValue()).toBe('TestPass!1234')
    expect(await pw.getAttribute('type')).toBe('password')
  })

  test('Create Account posts to /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-spec')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email)
    })
    const createCall = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$|\/)/.test(r.url))
    expect(createCall, 'POST /api/users').toBeTruthy()
    expect(createCall?.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('Sign In link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('a[href="/login"]').first().click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })
})
