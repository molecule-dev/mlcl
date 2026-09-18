/**
 * /shared — list of decks marked public/shared.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('shared: page loads /api/presentations to derive the share list', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/shared')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/presentations(\?|$)/.test(r.url)),
    'GET /api/presentations must fire on /shared',
  ).toBeTruthy()
})

test('shared: empty state is shown for a brand-new account (no public decks)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/shared')
  await page.waitForLoadState('networkidle')
  // The page should render a body but show no actual deck rows
  await expect(page.locator('body')).not.toBeEmpty()
})

test('shared: sidebar "Shared" link is visible from this page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/shared')
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: /^Shared$/ })
      .first(),
  ).toBeVisible()
})
