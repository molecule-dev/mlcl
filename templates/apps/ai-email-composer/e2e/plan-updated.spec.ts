import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('Plan-updated landing renders content for an authenticated user', async ({ page }) => {
  await signup(page)
  await page.goto('/plan-updated')
  await expect(page.locator('body')).toContainText(/.+/, { timeout: 10_000 })
})

test('Plan-updated landing has a Return Home / Dashboard link', async ({ page }) => {
  await signup(page)
  await page.goto('/plan-updated')
  const home = page.getByRole('link', { name: /home|dashboard|back/i }).first()
  await expect(home).toBeVisible({ timeout: 10_000 })
  const href = await home.getAttribute('href')
  expect(href, 'plan-updated home link must point at "/" or "/dashboard"').toMatch(
    /^\/(dashboard)?$/,
  )
})

test('Plan-updated route is auth-guarded — unauth visit redirects to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForURL(/\/login/, { timeout: 15_000 })
  await expect(page).toHaveURL(/\/login/)
})
