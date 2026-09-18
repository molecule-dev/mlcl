import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('Landing renders headline and primary CTAs', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByRole('link', { name: /get started|sign up/i }).first()).toBeVisible()
})

test('Landing → Sign in link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /sign in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})

test('Landing → Get started link routes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /get started|sign up/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})
