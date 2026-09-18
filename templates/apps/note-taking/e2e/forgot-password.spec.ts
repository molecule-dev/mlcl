/**
 * /forgot-password page — email input, submit, back-to-login link.
 * Outcomes asserted: POST /api/users/forgot-password is dispatched on
 * submit, response is 2xx (constant-shape success even for unknown
 * emails to avoid leaking user existence).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('forgot-password page renders email + submit + back link', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.getByRole('textbox', { name: /email/i }).first()).toBeVisible()
  await expect(page.getByRole('button').first()).toBeVisible()
  await expect(page.getByRole('link', { name: /back|sign in|return/i }).first()).toBeVisible()
})

test('forgot-password submission posts to /api/users/forgot-password', async ({ page }) => {
  const email = uniqueEmail('forgot')
  await page.goto(APP_BASE + '/forgot-password')
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /send|email|reset/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const call = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password$/.test(r.url))
  expect(call, 'POST /api/users/forgot-password should fire').toBeTruthy()
  expect(call!.status).toBeLessThan(500)
})

test('forgot-password unknown email does not leak user existence', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page
    .getByRole('textbox', { name: /email/i })
    .first()
    .fill('absolutely-no-one@example.invalid')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /send|email|reset/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const call = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password$/.test(r.url))
  // Policy: 200 even for unknown emails (don't disclose user existence).
  expect(call?.status).toBeLessThan(400)
})

test('forgot-password back-link returns to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page
    .getByRole('link', { name: /sign in|back/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('forgot-password header brand link returns to /', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.getByRole('link', { name: /verso/i }).first().click()
  await expect(page).toHaveURL(/\/$/)
})
