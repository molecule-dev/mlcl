import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('landing page renders brand and auth entry points', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('[data-mol-id="landing-login-link"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="landing-signup-link"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="landing-cta-signup"]')).toBeVisible()
})

test('root redirects unauthenticated visitors to the public landing', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page).toHaveURL(APP_BASE + '/')
})

test('signup from the landing reaches the authenticated dashboard', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.locator('[data-mol-id="landing-signup-link"]').click()
  await expect(page).toHaveURL(/\/signup$/)
  const { accessToken } = await signup(page)
  expect(accessToken).toBeTruthy()
  await expect(page).toHaveURL(/\/dashboard/)
})
