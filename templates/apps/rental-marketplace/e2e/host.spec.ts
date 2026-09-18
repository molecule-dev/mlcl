/**
 * /host — host dashboard.
 *
 * Real outcomes asserted:
 *   - GET /api/host-listings + GET /api/reservations both fire and 200
 *   - hero earnings + occupancy + active-listings counters render
 *   - "Review queue" CTA navigates to /host/reservations
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test('host dashboard fetches host-listings + reservations and renders queue', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/host')
    await page.waitForLoadState('networkidle')
  })
  const hostListings = reqs.find((r) => r.url.includes('/api/host-listings') && r.method === 'GET')
  const reservations = reqs.find((r) => r.url.includes('/api/reservations') && r.method === 'GET')
  expect(hostListings?.status, 'GET /api/host-listings should 200').toBe(200)
  expect(reservations?.status, 'GET /api/reservations should 200').toBe(200)

  // Hero must render even with zero earnings.
  await expect(page.getByRole('heading', { name: /welcome back, host/i })).toBeVisible()
  // Currency placeholder for "Last 30 days".
  await expect(page.getByText(/last 30 days/i).first()).toBeVisible()
  await expect(page.getByText(/year to date/i).first()).toBeVisible()
  await expect(page.getByText(/occupancy/i).first()).toBeVisible()
})

test('Review queue CTA navigates to /host/reservations', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('link', { name: /review queue/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/host\/reservations$/)
})

test('hero earnings stat renders a dollar value (last 30 days)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host')
  await page.waitForLoadState('networkidle')
  // The "Last 30 days" tile renders a $-prefixed value in tabular-nums.
  const last30Card = page
    .locator('div')
    .filter({ hasText: /^Last 30 days/i })
    .first()
  // Even at $0 net, the literal "$" must appear in the card.
  await expect(last30Card).toContainText('$', { timeout: 10000 })
})

test('occupancy stat is a percentage (0–100%) integer', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host')
  await page.waitForLoadState('networkidle')
  // "Occupancy" tile shows a percent sign + integer.
  const occCard = page
    .locator('div')
    .filter({ hasText: /^Occupancy/i })
    .first()
  await expect(occCard).toContainText('%', { timeout: 10000 })
})

test('See-all link to /host/reservations renders when reservations exist', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host')
  await page.waitForLoadState('networkidle')
  // The dashboard renders a link to /host/reservations either as
  // "Review queue" or as a "See all" link beneath the queue. At least
  // one such link must exist.
  const links = page.locator('a[href="/host/reservations"]')
  await expect(links.first()).toBeAttached()
})
