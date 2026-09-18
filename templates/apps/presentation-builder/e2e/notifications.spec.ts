/**
 * /notifications — derived activity feed from recent decks.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('notifications: page renders without errors', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/notifications/)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('notifications: page fetches /api/presentations to derive activity', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/presentations(\?|$)/.test(r.url)),
    'GET /api/presentations must fire on /notifications',
  ).toBeTruthy()
})

test('notifications: sidebar "Notifications" link is visible from this page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: /^Notifications$/ })
      .first(),
  ).toBeVisible()
})
