import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers.js'

test.describe('auth', () => {
  test('landing renders and points to /search and /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/', { waitUntil: 'domcontentloaded' })
    // The app is branded Auberge (branding.ts APP_NAME); 'Sojourn' was an earlier
    // name that survived only here.
    await expect(page).toHaveTitle(/auberge/i)
    await expect(page.getByRole('link', { name: /search/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /join|sign up|create/i }).first()).toBeVisible()
  })

  test('signup creates a user and lands somewhere other than /signup', async ({ page }) => {
    const creds = await signup(page)
    expect(creds.email).toMatch(/@example\.com$/)
    expect(page.url()).not.toMatch(/\/signup/)
  })

  test('session cookie persists across reload', async ({ page }) => {
    await signup(page)
    await page.reload()
    expect(page.url()).not.toMatch(/\/(signup|login)$/)
  })
})
