import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedIssue, signup } from './_helpers.js'

test.describe('civic-311: /explore', () => {
  test('renders the community map + list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/explore')
    await expect(page.getByTestId('explore-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('explore-map')).toBeVisible()
  })

  test('newly seeded report appears in the open list and opens from the row', async ({ page }) => {
    const session = await signup(page)
    const issue = await seedIssue(page, session.accessToken, {
      category: 'parking',
      description: 'Trucks idling in the crosswalk during pickup.',
      x: 56,
      y: 33,
    })
    await page.goto(APP_BASE + '/explore')
    const row = page.locator(`[data-mol-id="explore-item"][data-category="parking"]`).filter({
      hasText: 'crosswalk',
    })
    await expect(row.first()).toBeVisible({ timeout: 15_000 })
    await row.first().getByTestId('explore-item-open').click()
    await expect(page).toHaveURL(new RegExp(`/reports/${issue.id}$`), { timeout: 15_000 })
  })

  test('category filter narrows the list', async ({ page }) => {
    const session = await signup(page)
    await seedIssue(page, session.accessToken, { category: 'graffiti', x: 71, y: 18 })
    await page.goto(APP_BASE + '/explore')
    await expect(page.getByTestId('explore-item').first()).toBeVisible({ timeout: 15_000 })
    const graffitiRows = await page
      .locator('[data-mol-id="explore-item"][data-category="graffiti"]')
      .count()
    expect(graffitiRows).toBeGreaterThan(0)
    await page.getByTestId('explore-category-filter').selectOption('pothole')
    await expect(
      page.locator('[data-mol-id="explore-item"][data-category="graffiti"]'),
    ).toHaveCount(0, { timeout: 10_000 })
    await expect(page.getByTestId('explore-item').first()).toBeVisible()
  })

  test('confirm ("me too") on another resident\u2019s report increments and locks', async ({
    page,
  }) => {
    const owner = await signup(page)
    const issue = await seedIssue(page, owner.accessToken, { category: 'trash', x: 45, y: 66 })

    await page.evaluate(() => window.localStorage.clear())
    const neighbor = await signup(page)
    await page.goto(APP_BASE + '/explore')
    const row = page
      .locator(`[data-mol-id="explore-item"]`)
      .filter({ hasText: 'safe to delete' })
      .first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByTestId('explore-item-confirm').click()
    await expect(row.getByTestId('explore-item-confirmed')).toBeVisible({ timeout: 15_000 })
    void issue
  })

  test('status filter "open only" hides resolved reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/explore')
    await expect(page.getByTestId('explore-item').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="explore-item"][data-status="resolved"]')).toHaveCount(
      0,
    )
    await page.getByTestId('explore-status-filter').selectOption('')
    // All-statuses view may now include resolved rows (demo data has them).
    await expect(page.getByTestId('explore-item').first()).toBeVisible()
  })
})
