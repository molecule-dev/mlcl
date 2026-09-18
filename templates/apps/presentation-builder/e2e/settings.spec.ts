/**
 * /settings — account + billing + preferences.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('settings: page renders after signup', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/settings/)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('settings: page fetches /api/billing/status', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status(\?|$)/.test(r.url)),
    'GET /api/billing/status must fire',
  ).toBeTruthy()
})

test('settings: sidebar "Settings" link is visible from this page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: /^Settings$/ })
      .first(),
  ).toBeVisible()
})
