/**
 * /plan-updated — success page rendered after a Stripe Checkout completes.
 *
 * Per-page spec covering each row in observations/plan-updated.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('/plan-updated renders some success copy', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  // The page renders a heading or banner — accept any of welcome/upgraded/plan/thank.
  const text = await page.locator('body').innerText()
  expect(text).toMatch(/plan|thank|welcome|upgrade|congrat|success/i)
})

test('/plan-updated renders a Return-home control', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  const link = page
    .getByRole('link', { name: /return home|^home$|done/i })
    .or(page.getByRole('button', { name: /return home|^home$|done/i }))
    .first()
  await expect(link).toBeVisible()
})

test('Return-home control navigates to /', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page
    .getByRole('link', { name: /return home|^home$|done/i })
    .or(page.getByRole('button', { name: /return home|^home$|done/i }))
    .first()
    .click()
  // Authed redirect: / lands on Landing OR /explore depending on app's
  // authed-home behavior. Either is acceptable as long as we're not stuck
  // on /plan-updated.
  await expect(page).not.toHaveURL(/\/plan-updated/, { timeout: 10_000 })
})
