/**
 * Forgot-password: enter email, hit submit, see the success card.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('email input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').fill('hello@example.com')
  await expect(page.locator('input[type="email"]')).toHaveValue('hello@example.com')
})

test('submit replaces the form with the success card', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').fill(uniqueEmail('forgot'))
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Send reset link/i }).click()
    await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 15_000 })
  })
  // travel-booking config: forgotPasswordEndpoint = '/users/forgot-password'
  const resetReq = reqs.find(
    (r) => r.method === 'POST' && /forgot-password|forgotPassword|reset_password/.test(r.url),
  )
  expect(resetReq).toBeTruthy()
})

test('success heading is visible after submit', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').fill(uniqueEmail('forgot2'))
  await page.getByRole('button', { name: /Send reset link/i }).click()
  await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 15_000 })
})

test('back-to-sign-in link navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.getByRole('link', { name: /Back to sign in/i }).click()
  await expect(page).toHaveURL(/\/login/)
})
