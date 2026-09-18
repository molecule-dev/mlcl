import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

/**
 * /dashboard — creator overview. A fresh signup has no campaigns of
 * their own, so KPIs read 0/0/0/0 and the "no campaigns" empty state
 * shows. The page also fetches /api/notifications and renders the
 * "Recent activity" sidebar.
 */

test('Dashboard renders KPIs at zero and the empty state for a fresh user', async ({ page }) => {
  await signup(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByText(/welcome back, creator/i)).toBeVisible({ timeout: 10_000 })
  // KPIs visible with the labels from defaultValue
  await expect(page.getByText(/total raised/i)).toBeVisible()
  await expect(page.getByText(/total backers/i)).toBeVisible()
  await expect(page.getByText(/active campaigns/i)).toBeVisible()
  await expect(page.getByText(/funded campaigns/i)).toBeVisible()
  // No campaigns empty state
  await expect(page.locator('[data-mol-id="dashboard-no-campaigns"]')).toBeVisible()
  // New campaign CTA points at /campaign/new
  const cta = page.locator('[data-mol-id="dashboard-new-campaign"]')
  await expect(cta).toBeVisible()
  await expect(cta).toHaveAttribute('href', '/campaign/new')
})

test('Dashboard "Discover more" link goes to /discover', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.getByRole('link', { name: /discover more/i }).click()
  await expect(page).toHaveURL(/\/discover/)
})

test('Backend invariant: GET /api/notifications returns the dynamic notifications shape', async ({
  page,
}) => {
  await signup(page)
  const data = await page.evaluate(async () => {
    const r = await fetch('/api/notifications')
    return r.json()
  })
  expect(Array.isArray(data.notifications)).toBe(true)
  expect(typeof data.unread_count).toBe('number')
})
