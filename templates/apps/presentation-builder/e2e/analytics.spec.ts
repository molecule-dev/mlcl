/**
 * /analytics — derived stats from /api/presentations.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('analytics: page renders without errors', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/analytics')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/analytics/)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('analytics: page fetches /api/presentations to derive its numbers', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/presentations(\?|$)/.test(r.url)),
    'GET /api/presentations must fire on /analytics',
  ).toBeTruthy()
})

test('analytics: sidebar "Analytics" link is visible from this page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/analytics')
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: /^Analytics$/ })
      .first(),
  ).toBeVisible()
})
