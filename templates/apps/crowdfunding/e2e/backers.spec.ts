import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

/**
 * /backers — creator's aggregate backer list across every campaign they own.
 * Reads `api.myCampaigns()` then `api.campaignPledges(c.id)` for each. For
 * a fresh user with no campaigns the page renders the empty-state copy
 * (KPIs at 0, no rows). Backend invariant: GET /api/campaigns/mine returns
 * an empty array for a brand-new user, which means the per-campaign
 * pledges fetch never fires and the page does not crash.
 */

test('/backers shows the empty state for a fresh creator with no campaigns', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/backers')
  await expect(page.getByRole('heading', { name: /backers/i }).first()).toBeVisible({
    timeout: 10_000,
  })
  // KPI strip surfaces both "Unique backers" and "Total pledged" with $0/0
  await expect(page.locator('body')).toContainText(/Unique backers/i)
  await expect(page.locator('body')).toContainText(/0/)
})

test('/backers fetches my-campaigns endpoint and stays mounted', async ({ page }) => {
  await signup(page)
  let calledMine = false
  page.on('response', (r) => {
    if (/\/api\/campaigns\/mine/.test(r.url()) && r.request().method() === 'GET') {
      calledMine = true
    }
  })
  await page.goto(APP_BASE + '/backers')
  await expect(page.getByRole('heading', { name: /backers/i }).first()).toBeVisible({
    timeout: 10_000,
  })
  // Give the effect a tick to fire
  await page.waitForTimeout(500)
  expect(calledMine, 'GET /api/campaigns/mine must fire on /backers mount').toBe(true)
})
