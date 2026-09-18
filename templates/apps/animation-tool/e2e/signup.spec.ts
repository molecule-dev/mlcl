import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup (Signup)', () => {
  test('first-name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#firstName').fill('Ada')
    await expect(page.locator('input#firstName')).toHaveValue('Ada')
  })

  test('last-name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#lastName').fill('Lovelace')
    await expect(page.locator('input#lastName')).toHaveValue('Lovelace')
  })

  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#email').fill('ada@example.com')
    await expect(page.locator('input#email')).toHaveValue('ada@example.com')
  })

  test('password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#password').fill('Pa55word!')
    await expect(page.locator('input#password')).toHaveValue('Pa55word!')
  })

  test('confirm-password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#confirm').fill('Pa55word!')
    await expect(page.locator('input#confirm')).toHaveValue('Pa55word!')
  })

  test('Create account creates a real user, lands on /dashboard, persists across reload', async ({
    page,
  }) => {
    const email = uniqueEmail('signup')
    const password = 'TestPass123!'
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input#firstName').fill('Ada')
      await page.locator('input#lastName').fill('Lovelace')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill(password)
      await page.locator('input#confirm').fill(password)
      await page.getByRole('button', { name: /create\s*account/i }).click()
      await page.waitForURL((u) => !u.pathname.includes('/signup'), { timeout: 15_000 })
    })
    const signupCall = reqs.find((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(signupCall, 'POST /api/users fired').toBeTruthy()
    expect(signupCall!.status).toBeLessThan(300)
    expect(page.url(), 'lands on /dashboard').toMatch(/\/dashboard/)
    // Reload and confirm session survives — the AuthGuard would punt back to /login otherwise.
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    expect(page.url(), 'session survives reload').toMatch(/\/dashboard/)
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
