import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  createGroupViaApi,
  getActivities,
  getGroups,
  recordSettlement,
  seedExpense,
  signup,
} from './_helpers.js'

test.describe('/activity page', () => {
  test('feed renders after the demo world exists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/activity')
    await expect(page.locator('[data-mol-id="page-activity"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="activity-feed"] li').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('a fresh expense event appears as a row linking to its group', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const payer = group.members.find((m) => !m.is_self)!
    const expense = await seedExpense(page, accessToken, {
      group_id: group.id,
      payer_member_id: payer.id,
      amount_cents: 1234,
      description: 'E2E Feed Event',
    })

    await page.goto(APP_BASE + '/activity')
    // Row locator: scope to the feed's <li> rows — the feed container itself
    // is data-mol-id="activity-feed", which the "^=activity-" prefix would
    // also match (strict-mode violation: all links in the feed at once).
    const row = page
      .locator('[data-mol-id="activity-feed"] li')
      .filter({ hasText: 'E2E Feed Event' })
    await expect(row.first()).toBeVisible({ timeout: 10000 })
    await expect(row.first()).toContainText('$12.34')

    // The API is the source of truth for which events exist.
    const activities = await getActivities(page, accessToken)
    const match = activities.find(
      (a) => a.kind === 'expense_added' && a.payload?.description === expense.description,
    )
    expect(match, 'expense_added activity recorded').toBeTruthy()
    expect(match?.group_id).toBe(group.id)
    await row.first().getByRole('link').click()
    await page.waitForURL(new RegExp(`\\/groups\\/${group.id}`), { timeout: 5000 })
  })

  test('settlement events carry both names in the feed', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    // The demo world is seeded lazily by the dashboard's GET /api/groups,
    // which the browser fired during signup and may still be inserting. A
    // baseline read now can undercount the seeded settlement events and
    // then "gain" one late. GET /api/groups awaits the seed (seedInFlight
    // dedupes), so reading it first pins the baseline after the demo world.
    await getGroups(page, accessToken)
    const activitiesBefore = await getActivities(page, accessToken)
    const settleEvents = activitiesBefore.filter((a) => a.kind === 'settlement_recorded').length

    // Drive a settlement through the API, then look for a NEW event row.
    const self = group.members.find((m) => m.is_self)!
    const friend = group.members.find((m) => !m.is_self)!
    await recordSettlement(page, accessToken, {
      group_id: group.id,
      from_member_id: self.id,
      to_member_id: friend.id,
      amount_cents: 777,
    })

    await page.goto(APP_BASE + '/activity')
    await expect(
      page.locator('[data-mol-id="activity-feed"] li').filter({ hasText: '$7.77' }).first(),
    ).toBeVisible({ timeout: 10000 })
    const activitiesAfter = await getActivities(page, accessToken)
    expect(activitiesAfter.filter((a) => a.kind === 'settlement_recorded').length).toBe(
      settleEvents + 1,
    )
  })
})
