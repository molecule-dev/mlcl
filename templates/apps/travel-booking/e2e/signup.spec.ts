/**
 * Signup: a fresh user creates an account, lands off /signup, and the
 * access token is persisted to localStorage.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test('first name input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="given-name"]').fill('Asha')
  await expect(page.locator('input[autocomplete="given-name"]')).toHaveValue('Asha')
})

test('last name input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="family-name"]').fill('Bauer')
  await expect(page.locator('input[autocomplete="family-name"]')).toHaveValue('Bauer')
})

test('email input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').fill('asha@example.com')
  await expect(page.locator('input[type="email"]')).toHaveValue('asha@example.com')
})

test('password input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="password"]').first().fill('Password1!')
  await expect(page.locator('input[type="password"]').first()).toHaveValue('Password1!')
})

test('confirm password input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const pwds = page.locator('input[type="password"]')
  await pwds.first().fill('Password1!')
  await pwds.nth(1).fill('Password1!')
  await expect(pwds.nth(1)).toHaveValue('Password1!')
})

test('submit POSTs /api/users and stores access token', async ({ page }) => {
  const email = uniqueEmail('signup')
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="given-name"]').fill('Asha')
  await page.locator('input[autocomplete="family-name"]').fill('Bauer')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill('TestPass123!')
  await page.locator('input[type="password"]').nth(1).fill('TestPass123!')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Create account/i }).click()
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  })
  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(?!\?)/.test(r.url))
  expect(userPost?.status).toBeGreaterThanOrEqual(200)
  expect(userPost?.status).toBeLessThan(300)
  const token = await getAccessToken(page)
  expect(token).toBeTruthy()
})

test('Sign in link navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page
    .getByRole('link', { name: /^Sign in$/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})
