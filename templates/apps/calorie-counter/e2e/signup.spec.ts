import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup (Signup)', () => {
  test('name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const inp = page.locator('input[name=name]').first()
    await inp.fill('Smoke User')
    await expect(inp).toHaveValue('Smoke User')
  })

  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const inp = page.locator('input[type=email]').first()
    await inp.fill('me@example.com')
    await expect(inp).toHaveValue('me@example.com')
  })

  test('password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const inp = page.locator('input[name=password]').first()
    await inp.fill('Pa55word!')
    await expect(inp).toHaveValue('Pa55word!')
  })

  test('confirm-password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const inp = page.locator('input[name=confirmPassword]').first()
    await inp.fill('Pa55word!')
    await expect(inp).toHaveValue('Pa55word!')
  })

  test('Create account POSTs /api/users and routes to /onboarding', async ({ page }) => {
    const email = uniqueEmail('signup')
    const password = 'TestPass123!'
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[name=name]').fill('Nosh User')
    await page.locator('input[type=email]').fill(email)
    await page.locator('input[name=password]').fill(password)
    await page.locator('input[name=confirmPassword]').fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create account/i }).click()
      await page.waitForURL(/\/(onboarding|today)/, { timeout: 20_000 })
    })
    const signupCall = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(signupCall, 'POST /api/users fired').toBeTruthy()
    expect(signupCall!.status).toBeLessThan(300)
  })

  test('"Sign in" link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
