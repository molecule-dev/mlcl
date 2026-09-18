import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  getActiveCampaigns,
  pickTwoCategories,
  pickTwoDistinctTitles,
  signup,
} from './_helpers'

/**
 * /discover — public-facing campaign feed. The page reads
 * GET /api/campaigns and GET /api/campaigns/search and renders cards.
 * Each spec reads the campaigns it asserts on from the same endpoint the
 * page reads, so the suite still holds once the demo catalog is replaced.
 */

test('Discover page renders the active catalog + category bar + hero', async ({ page }) => {
  await signup(page)
  const catalog = await getActiveCampaigns(page)
  await page.goto(APP_BASE + '/discover')
  // Hero copy
  await expect(page.getByText(/find what to back next/i)).toBeVisible({ timeout: 10_000 })
  // Result count surfaces the catalog total
  await expect(page.locator('[data-mol-id="discover-result-count"]')).toContainText(
    new RegExp(`\\b${catalog.length} campaigns?\\b`, 'i'),
    { timeout: 10_000 },
  )
  // Every active campaign renders a card
  for (const campaign of catalog) {
    await expect(page.locator(`[data-mol-id="campaign-card-${campaign.id}"]`)).toBeVisible()
  }
})

test('Category filter chips re-fetch and update the rendered campaigns', async ({ page }) => {
  await signup(page)
  // The chips are the app's own fixed category list; which campaigns sit
  // behind them is catalog content, so read the pair under test from the API.
  const { target, other } = await pickTwoCategories(page)
  await page.goto(APP_BASE + '/discover')
  await expect(page.locator(`[data-mol-id="campaign-card-${target.id}"]`)).toBeVisible({
    timeout: 10_000,
  })
  await page.locator(`[data-mol-id="category-${target.category.toLowerCase()}"]`).click()
  await expect(page.locator(`[data-mol-id="campaign-card-${target.id}"]`)).toBeVisible({
    timeout: 10_000,
  })
  // A campaign in a different category must drop out of the feed.
  await expect(page.locator(`[data-mol-id="campaign-card-${other.id}"]`)).toHaveCount(0)
})

test('Backend invariant: GET /api/campaigns?status=active returns only active rows', async ({
  page,
}) => {
  await signup(page)
  const list = await getActiveCampaigns(page)
  // Every row must actually be active (not "draft" leaking into the feed)
  for (const row of list) {
    expect(row.status).toBe('active')
    expect(row.title, 'every catalog row carries a title').toBeTruthy()
  }
})

test('Search box filters the feed via /api/campaigns/search', async ({ page }) => {
  await signup(page)
  // Two campaigns whose titles do not contain one another, so searching one
  // must exclude the other.
  const { target, other } = await pickTwoDistinctTitles(page)
  await page.goto(APP_BASE + '/discover')
  await expect(page.locator(`[data-mol-id="campaign-card-${target.id}"]`)).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('[data-mol-id="discover-search"]').fill(target.title)
  await expect(page.locator(`[data-mol-id="campaign-card-${target.id}"]`)).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator(`[data-mol-id="campaign-card-${other.id}"]`)).toHaveCount(0)
})
