import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiPost, signup } from './_helpers.js'

test('Dashboard renders the heading + Compose CTA + KPI sections for a fresh user', async ({
  page,
}) => {
  await signup(page)
  await page.goto('/dashboard')
  await expect(page.locator('[data-mol-id="dashboard-page"]')).toBeVisible({ timeout: 15_000 })
  // The Compose CTA links to /compose.
  const cta = page.locator('[data-mol-id="dashboard-compose-cta"]')
  await expect(cta).toBeVisible()
  await expect(cta).toHaveAttribute('href', '/compose')
  // Recent sends + templates sections render (either empty state or list).
  // For a fresh user, the empty-state row appears in either branch.
  await expect(page.locator('[data-mol-id="dashboard-recent-empty"]')).toBeVisible({
    timeout: 15_000,
  })
})

test('Dashboard CTA navigates to /compose', async ({ page }) => {
  await signup(page)
  await page.goto('/dashboard')
  await page.locator('[data-mol-id="dashboard-compose-cta"]').click()
  await expect(page).toHaveURL(/\/compose/, { timeout: 10_000 })
})

test('Dashboard "Recent sends" appears once a send happens', async ({ page }) => {
  test.setTimeout(60_000)
  await signup(page)
  // Seed one send.
  const draft = await apiPost<{ id: string }>(page, '/drafts', {
    subject: 'Recent sends test ' + Date.now(),
    body: 'Body for the dashboard recent-sends section.',
    recipients: ['recent@example.com'],
  })
  await apiPost(page, `/drafts/${draft.body!.id}/send`, {})

  await page.goto('/dashboard')
  // After at least one send the empty-state should disappear.
  await expect(page.locator('[data-mol-id="dashboard-recent-empty"]')).toHaveCount(0, {
    timeout: 15_000,
  })
})
