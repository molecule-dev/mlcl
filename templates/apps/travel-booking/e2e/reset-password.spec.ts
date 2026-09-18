/**
 * Reset-password: form behavior. Without a real token, submit returns 4xx
 * which we just observe as a network call (no redirect required).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('new password input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake&email=foo@example.com')
  await page.locator('input[type="password"]').first().fill('NewPassword1!')
  await expect(page.locator('input[type="password"]').first()).toHaveValue('NewPassword1!')
})

test('confirm password input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake&email=foo@example.com')
  await page.locator('input[type="password"]').nth(1).fill('NewPassword1!')
  await expect(page.locator('input[type="password"]').nth(1)).toHaveValue('NewPassword1!')
})

test('mismatched passwords surface inline error and do not submit', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake&email=foo@example.com')
  await page.locator('input[type="password"]').first().fill('A-good-pass-1!')
  await page.locator('input[type="password"]').nth(1).fill('B-different-2!')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Reset password/i }).click()
    await expect(page.getByText(/don.t match/i)).toBeVisible()
  })
  const resetReq = reqs.find(
    (r) => r.method === 'POST' && /reset_password|resetPassword|reset-password/.test(r.url),
  )
  expect(resetReq).toBeFalsy()
})

test('valid form submission fires POST to reset endpoint', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake-token&email=foo@example.com')
  await page.locator('input[type="password"]').first().fill('NewPassword1!')
  await page.locator('input[type="password"]').nth(1).fill('NewPassword1!')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Reset password/i }).click()
    await page.waitForTimeout(2_000)
  })
  const resetReq = reqs.find(
    (r) => r.method === 'POST' && /reset_password|resetPassword|reset-password/.test(r.url),
  )
  expect(resetReq).toBeTruthy()
})

test('back-to-sign-in link navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  await page.getByRole('link', { name: /Back to sign in/i }).click()
  await expect(page).toHaveURL(/\/login/)
})
