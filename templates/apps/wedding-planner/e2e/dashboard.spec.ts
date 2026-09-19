import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getDashboardSummary, getWedding, signup, uniqueEmail } from './_helpers.js'

test.describe('/dashboard page', () => {
  test('renders the wedding header, KPI row and RSVP share card', async ({ page }) => {
    const email = uniqueEmail('dash')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/dashboard')

    await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible({
      timeout: 15000,
    })
    // The share card carries the couple's real code, read from the same API.
    const wedding = await getWedding(page, accessToken)
    await expect(page.locator('[data-mol-id="dashboard-rsvp-share"]')).toContainText(
      wedding.rsvp_code,
    )
    for (const kpi of [
      'dashboard-kpi-days',
      'dashboard-kpi-headcount',
      'dashboard-kpi-budget',
      'dashboard-kpi-tasks',
    ]) {
      await expect(page.locator(`[data-mol-id="${kpi}"]`)).toBeVisible()
    }
  })

  test('RSVP tally chips show the same counts the API reports', async ({ page }) => {
    const email = uniqueEmail('dash-tally')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible({
      timeout: 15000,
    })

    const summary = (await getDashboardSummary(page, accessToken)) as {
      rsvp_tally: Record<string, number>
    }
    for (const [status, count] of Object.entries(summary.rsvp_tally)) {
      const chip = page.locator(`[data-mol-id="dashboard-tally-${status}"]`)
      await expect(chip).toBeVisible()
      await expect(chip).toContainText(String(count))
    }
  })

  test('regenerating the RSVP code mints a fresh one and reloads the card', async ({ page }) => {
    const email = uniqueEmail('dash-code')
    const { accessToken } = await signup(page, email)
    const before = await getWedding(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="dashboard-rsvp-share"]')).toContainText(
      before.rsvp_code,
      { timeout: 15000 },
    )

    await page.locator('[data-mol-id="dashboard-regenerate-code"]').click()
    await expect(page.locator('[data-mol-id="dashboard-rsvp-share"]')).not.toContainText(
      before.rsvp_code,
      { timeout: 15000 },
    )
    const after = await getWedding(page, accessToken)
    expect(after.rsvp_code).not.toBe(before.rsvp_code)
  })

  test('view guest page link opens the public RSVP page', async ({ page }) => {
    const email = uniqueEmail('dash-link')
    const { accessToken } = await signup(page, email)
    const wedding = await getWedding(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-mol-id="dashboard-view-rsvp-page"]').click()
    await expect(page).toHaveURL(new RegExp(`/rsvp/${wedding.rsvp_code}$`))
    await expect(page.locator('[data-mol-id="page-rsvp"]')).toBeVisible({ timeout: 10000 })
  })
})
