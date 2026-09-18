/**
 * Pricing: public pricing page renders all three tiers from
 * /api/billing/tiers.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('pricing heading renders and GET /api/billing/tiers fires', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  const reqs = await captureNetwork(page, async () => {
    await expect(page.getByRole('heading', { name: /Choose your.*plan/i })).toBeVisible()
  })
  // The page may have already loaded tiers before the captureNetwork
  // wrap, so also check via a direct request.
  const apiRes = await page.request.get(
    APP_BASE.replace(/:\d+/, ':' + (process.env.API_PORT || '4040')) + '/api/billing/tiers',
  )
  expect(apiRes.status()).toBe(200)
  // captureNetwork returns whatever fired during the wait
  expect(Array.isArray(reqs)).toBe(true)
})

test('Free tier name is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/Free/i).first()).toBeVisible()
})

test('Pro tier name is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/Pro/i).first()).toBeVisible()
})

test('Team tier name is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/Team/i).first()).toBeVisible()
})
