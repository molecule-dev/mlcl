// Per-page spec for /plan-updated. Post-checkout marketing landing.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('Plan-updated renders the success heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.locator('main')).toContainText(/plan|updated|thank/i, { timeout: 5_000 })
})

test('Plan-updated exposes a "Return home" CTA wrapped in a Link to /', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  const cta = page.getByRole('button', { name: /return home/i })
  await expect(cta).toBeVisible()
  // The button is wrapped in <Link to="/">; verify the surrounding <a href="/">.
  const link = page.locator('a[href="/"]').filter({ has: cta })
  await expect(link).toHaveCount(1)
})

test('Clicking Return home navigates back to / (root marketing landing)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page.getByRole('button', { name: /return home/i }).click()
  await page.waitForURL(/\/$/, { timeout: 10_000 })
  expect(new URL(page.url()).pathname).toBe('/')
})

test('Plan-updated is purely presentational — fires no plan-mutating /api calls', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
  })
  // Stripe webhook flips the plan server-side; this page must not POST/PUT
  // to billing endpoints itself (which would let users self-promote).
  const billingMutations = reqs.filter(
    (r) =>
      ['POST', 'PUT', 'PATCH'].includes(r.method) &&
      /\/api\/(billing|subscriptions|plan)\b/.test(r.url),
  )
  expect(billingMutations).toEqual([])
})
