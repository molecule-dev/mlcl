import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, pickBackableCampaign, pickCampaignWithUpdate, signup } from './_helpers'

/**
 * /campaign/:id — public campaign detail page. Reads
 * GET /api/campaigns/:id (with decorated tiers/updates) and renders
 * hero, tiers, updates list, and a "Back this campaign" CTA that
 * navigates to /campaign/:id/pledge.
 *
 * The campaign each spec drives comes from the live catalog, not from a
 * seeded id — the demo catalog is the first thing an app's owner replaces.
 */

test('campaign detail loads a catalog campaign with tiers + progress + updates', async ({
  page,
}) => {
  await signup(page)
  const { campaign, update } = await pickCampaignWithUpdate(page)
  await page.goto(APP_BASE + '/campaign/' + campaign.id)
  // Title from the API
  await expect(page.getByRole('heading', { name: campaign.title }).first()).toBeVisible({
    timeout: 10_000,
  })
  // Every tier the API returned renders
  for (const tier of campaign.tiers) {
    await expect(page.locator(`[data-mol-id="reward-tier-${tier.id}"]`)).toBeVisible()
  }
  // Progress / pledged copy carries the campaign's own goal. (The pledged
  // total itself moves as other specs back the campaign, so only assert it
  // renders.)
  await expect(page.locator('[data-mol-id="campaign-pledged-total"]')).toBeVisible()
  const goal = `$${Math.round(campaign.goal_cents / 100).toLocaleString()}`
  await expect(page.getByText(`pledged of ${goal} goal`).first()).toBeVisible()
  // The campaign's latest update renders
  await expect(page.locator(`[data-mol-id="update-${update.id}"]`)).toBeVisible()
  await expect(page.locator(`[data-mol-id="update-${update.id}"]`)).toContainText(update.title)
  // Back-this-campaign CTA goes to the pledge route
  const cta = page.locator('[data-mol-id="cta-pledge"]').first()
  await expect(cta).toHaveAttribute('href', new RegExp(`/campaign/${campaign.id}/pledge`))
})

test('GET /api/campaigns/:id returns the decorated structure (tiers + creator_name + cents)', async ({
  page,
}) => {
  await signup(page)
  // Assert the SHAPE the frontend depends on, against whichever campaign the
  // catalog holds — not the numbers one seeded row happens to carry.
  const campaign = await pickBackableCampaign(page)
  expect(campaign.title).toBeTruthy()
  expect(campaign.creator_name, 'creator_name is joined in').toBeTruthy()
  expect(campaign.goal_cents).toBe(Math.round(Number(campaign.goal_amount) * 100))
  expect(campaign.pledged_cents).toBe(Math.round(Number(campaign.raised_amount) * 100))
  expect(Array.isArray(campaign.tiers)).toBe(true)
  for (const tier of campaign.tiers) {
    // Tier shape (cents not dollars at top level, plus current_backers)
    expect(tier.title).toBeTruthy()
    expect(tier.price_cents).toBe(Math.round(Number(tier.amount) * 100))
    expect(typeof (tier as unknown as { current_backers: unknown }).current_backers).toBe('number')
  }
})

test('an unknown campaign id renders the "not found" error (does not crash)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/campaign/00000000-0000-0000-0000-000000000000')
  // Component renders <div data-mol-id="campaign-error"> on either fetch error or null campaign.
  await expect(page.locator('[data-mol-id="campaign-error"]')).toBeVisible({ timeout: 10_000 })
})
