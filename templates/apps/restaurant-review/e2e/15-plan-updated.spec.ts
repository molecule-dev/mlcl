/**
 * Plan updated — the post-Stripe-checkout return surface. It shouldn't
 * crash regardless of whether the plan actually changed; the checkout
 * webhook is what flips planKey, and this page is a confirmation render.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('/plan-updated renders without crash for an unauthed user', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page).toHaveURL(/\/plan-updated/)
})

test('/plan-updated renders some heading-like content', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  // Should have at least one heading or paragraph so users see SOMETHING.
  const headingCount = await page.getByRole('heading').count()
  const paragraphCount = await page.locator('p').count()
  expect(headingCount + paragraphCount).toBeGreaterThan(0)
})

test('/plan-updated provides a path back into the app', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  const links = await page.getByRole('link').allTextContents()
  const txt = links.join(' ').toLowerCase()
  expect(txt).toMatch(/(home|discover|morsel|continue|back|app|account|settings)/)
})
