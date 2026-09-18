import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signupUI, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders name + email + password inputs and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
  })

  test('Signup creates a user account, persists JWT, and routes to /feed', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      const { accessToken } = await signupUI(page)
      expect(accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
      await expect(page).toHaveURL(/\/feed/)
    })
    expect(reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))).toBeTruthy()
  })

  test('Signup rejects duplicate emails', async ({ page }) => {
    const email = uniqueEmail()
    await signupUI(page, email)
    const ctx = await page.context().browser()!.newContext()
    const newPage = await ctx.newPage()
    await newPage.goto(APP_BASE + '/signup')
    await newPage.locator('input[type="text"]').first().fill('Duplicate')
    await newPage.locator('input[type="email"]').first().fill(email)
    await newPage.locator('input[type="password"]').first().fill('TestPass!1234')
    await newPage.locator('form button[type="submit"]').first().click()
    await newPage.waitForTimeout(2000)
    await expect(newPage).toHaveURL(/\/signup/)
    await ctx.close()
  })

  test('"Already have an account? Sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.locator('a[href="/login"]').first()
    await expect(link).toHaveAttribute('href', '/login')
  })

  test('signup form fields accept and reflect typed values', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.locator('input[type="text"]').first()
    const email = page.locator('input[type="email"]').first()
    const pw = page.locator('input[type="password"]').first()
    await name.fill('Type Test User')
    await email.fill('typetest@flagship.test')
    await pw.fill('TestPass!1234')
    await expect(name).toHaveValue('Type Test User')
    await expect(email).toHaveValue('typetest@flagship.test')
    await expect(pw).toHaveValue('TestPass!1234')
  })
})
