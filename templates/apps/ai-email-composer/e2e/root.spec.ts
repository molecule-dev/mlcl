import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('Landing page renders the hero heading above the fold', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
    timeout: 15_000,
  })
})

test('Landing has a Sign In link that routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const signin = page.getByRole('link', { name: /sign in/i }).first()
  await expect(signin).toBeVisible()
  await signin.click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})

test('Landing has a primary CTA that routes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const cta = page
    .getByRole('link', { name: /try signet free|start writing|sign up|get started/i })
    .first()
  await expect(cta).toBeVisible()
  // The CTA must point at /signup so a brand-new visitor lands on the
  // sign-up form. Verify the href explicitly to catch the
  // "button-that-only-toasts" placeholder shape.
  const href = await cta.getAttribute('href')
  expect(href).toBe('/signup')
  await cta.click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})
