/**
 * /signup — registration page.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('signup: page renders the email + password form fields', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test('signup: a "sign up" submit button exists', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(
    page.getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i }).first(),
  ).toBeVisible()
})

test('signup: submitting valid credentials creates a user (POST /api/users → 201)', async ({
  page,
}) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
  })
  const created = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(created, 'POST /api/users must succeed').toBeTruthy()
  expect(created!.status).toBe(201)
})

test('signup: after successful signup the user is redirected away from /signup', async ({
  page,
}) => {
  await signup(page)
  await expect(page).not.toHaveURL(/\/signup$/)
})
