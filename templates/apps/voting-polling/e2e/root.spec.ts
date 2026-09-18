import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('Landing page renders the marketing hero (h1)', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /every voice counted/i })).toBeVisible()
})

test('Landing page exposes the primary "Start a poll" CTA', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /start a poll/i }).first()).toBeVisible()
})

test('Landing page exposes a "Sign in" link in the chrome', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
})

test('Landing page renders multiple "Start a poll"/"Sign up" CTAs (hero + footer)', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/')
  // The marketing layout repeats the conversion CTA (hero + footer band).
  // Both should be present on a real production-grade landing.
  const ctas = page.getByRole('link', { name: /start a poll|sign\s*up|create/i })
  await expect(ctas.nth(1)).toBeAttached()
})

test('observation invariant: navigating to / does not fire any /api request (purely static landing)', async ({
  page,
}) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  // The landing page is a public marketing page — it should issue
  // navigation/asset requests but no /api/* request prior to login.
  // This is the documented "(static html)" expectation in the obs file.
  const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
  expect(apiCalls.length, 'no /api calls expected on bare landing').toBe(0)
})
