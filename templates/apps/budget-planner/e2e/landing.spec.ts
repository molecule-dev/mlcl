import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('Landing page renders nav with Sign in / Sign up', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  // The Coffer landing page CTAs are localized under "Start budgeting" /
  // "Start budgeting free" — accept either, plus the standard generics.
  await expect(
    page
      .getByRole('link', {
        name: /sign\s*up|get started|create account|try free|start (budgeting|now|free)/i,
      })
      .first(),
  ).toBeVisible()
})

test('Landing has feature panels (envelope budgeting, goal tracking, etc.)', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  // The features list is hard-coded in Landing.tsx
  await expect(page.getByText(/envelope budgeting/i)).toBeVisible()
  await expect(page.getByText(/goal tracking/i)).toBeVisible()
})

test('Sign-in link from Landing routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /sign in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})
