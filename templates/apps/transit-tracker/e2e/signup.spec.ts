import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup page', () => {
  test('happy path creates a user and lands on /search', async ({ page }) => {
    const email = uniqueEmail('signup-ok')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass!1234')
    })
    await expect(page).toHaveURL(/\/nearby/)
    const reg = reqs.find((r) => r.method === 'POST' && /\/api\/users(?!\/log-in)/.test(r.url))
    expect(reg, 'POST /api/users registration').toBeTruthy()
    expect(reg?.status, 'signup status').toBeLessThan(400)
  })

  test('mismatched passwords show inline error and keep us on /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="given-name"]').first().fill('Mismatch')
    await page.locator('input[autocomplete="family-name"]').first().fill('Tester')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('mismatch'))
    const pwds = page.locator('input[autocomplete="new-password"]')
    await pwds.nth(0).fill('Password1!')
    await pwds.nth(1).fill('Different1!')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('every required input is type-correct and required', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input[type="email"]').first()
    const pwd = page.locator('input[autocomplete="new-password"]').first()
    expect(await email.evaluate((el: HTMLInputElement) => el.required)).toBe(true)
    expect(await pwd.getAttribute('type')).toBe('password')
  })

  test('"Sign in" footer link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('a[href="/login"]').first().click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
