/**
 * Public landing page (/). Brand wordmark, sign-in / join CTAs, and
 * the hero search card. No auth required.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('landing renders the Sojourn brand wordmark', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /Sojourn/i }).first()).toBeVisible()
})

test('Sign in link navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /^Sign in$/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('Join Sojourn CTA navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /Join Sojourn/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('hero search button is visible on the landing page', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const reqs = await captureNetwork(page, async () => {
    await expect(page.getByRole('button', { name: /search/i }).first()).toBeVisible()
  })
  // Landing makes no required API calls (it's static content); the
  // captureNetwork wrap merely records what the public page emits.
  expect(Array.isArray(reqs)).toBe(true)
})
