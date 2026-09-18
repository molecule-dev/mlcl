import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getCampaign, pickCampaignWithUpdate, signup } from './_helpers'

/**
 * End-to-end kitchen-sink flow: a single user signs up, walks every
 * primary feature in sequence, and verifies that each action's backend
 * invariant holds on the next read. Catches integration regressions
 * that per-page specs miss (e.g. a pledge that succeeds on /pledge but
 * the row never shows on /my-pledges; a campaign that publishes but
 * vanishes from /api/campaigns).
 *
 * The campaign backed is read from the live catalog, not named.
 */
test('signup → discover → campaign → pledge → my-pledges → notifications → settings → profile → reload', async ({
  page,
}) => {
  // 1) Signup → /dashboard
  const { name } = await signup(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByText(/welcome back, creator/i)).toBeVisible({ timeout: 10_000 })

  // 2) Discover renders the catalog
  const { campaign, update } = await pickCampaignWithUpdate(page)
  const tier = campaign.tiers[0]
  await page.goto(APP_BASE + '/discover')
  await expect(page.locator(`[data-mol-id="campaign-card-${campaign.id}"]`)).toBeVisible({
    timeout: 10_000,
  })

  // 3) Campaign detail loads
  await page.goto(APP_BASE + '/campaign/' + campaign.id)
  await expect(page.getByRole('heading', { name: campaign.title }).first()).toBeVisible({
    timeout: 10_000,
  })

  // 4) Read the current raised total before pledging
  const before = await getCampaign(page, campaign.id)
  const beforeRaised = Number(before.raised_amount)

  // 5) Pledge: the checkout pre-selects the cheapest tier, fill shipping, confirm
  await page.goto(APP_BASE + '/campaign/' + campaign.id + '/pledge')
  await page.locator('#ship-name').fill('Journey Tester')
  await page.locator('#ship-addr').fill('789 Journey Ln, Bend OR 97701')
  const pledgeReqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /confirm pledge/i }).click()
    await expect(page).toHaveURL(new RegExp(`/campaign/${campaign.id}\\?pledged=1`), {
      timeout: 30_000,
    })
  })
  expect(
    pledgeReqs.find((r) => /\/api\/pledges/.test(r.url) && r.method === 'POST')?.status,
  ).toBeLessThan(400)

  // 6) Backend invariants — pledge persists and campaign total bumps
  const after = await getCampaign(page, campaign.id)
  expect(Number(after.raised_amount) - beforeRaised).toBeCloseTo(tier.amount, 0)

  const myPledges = await page.evaluate(async () => {
    const r = await fetch('/api/pledges/my')
    return r.json()
  })
  const our = myPledges.find(
    (p: { campaign_id: string; status: string }) =>
      p.campaign_id === campaign.id && p.status === 'active',
  )
  expect(our).toBeTruthy()

  // 7) /my-pledges page also reflects the pledge
  await page.goto(APP_BASE + '/my-pledges')
  await expect(page.getByText(campaign.title).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(tier.title).first()).toBeVisible()

  // 8) /notifications: backing the campaign surfaces its creator update
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByText(update.title).first()).toBeVisible({ timeout: 10_000 })

  // 9) Settings round-trip: change name, save, GET reflects, reload reflects
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-tab-profile"]').click()
  const nextName = name + ' Updated'
  await page.locator('#display-name').fill(nextName)
  await page.locator('[data-mol-id="settings-save-profile"]').click()
  await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 8_000 })

  // 10) /profile/:me shows the new name
  const me = await page.evaluate(async () => {
    const r = await fetch('/api/profiles/me')
    return r.json()
  })
  expect(me.name).toBe(nextName)
  await page.goto(APP_BASE + '/profile/' + me.id)
  await expect(page.getByText(nextName).first()).toBeVisible({ timeout: 10_000 })

  // 11) Full reload: pledge still on /my-pledges
  await page.goto(APP_BASE + '/my-pledges')
  await page.reload()
  await expect(page.getByText(campaign.title).first()).toBeVisible({ timeout: 10_000 })
})
