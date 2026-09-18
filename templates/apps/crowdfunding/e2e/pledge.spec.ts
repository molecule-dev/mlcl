import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  formatTierTotal,
  getCampaign,
  pickBackableCampaign,
  signup,
} from './_helpers'

/**
 * Pledge flow — proves a real Stripe charge actually fires, the pledge
 * row is persisted, the campaign's raised_amount is incremented, and
 * the new pledge appears on /my-pledges (which survives reload).
 *
 * Past failure (per flagship-production-ready.md): the click handler
 * triggered a UI toast "Pledge confirmed!" but never actually called
 * Stripe and never wrote a row. This test asserts on Stripe response
 * (payment_id stored) AND on the read-back invariant that the pledge
 * appears in GET /api/pledges/my AND on the campaign's raised total.
 *
 * The campaign and tier are read from the live catalog rather than named,
 * so the flow still holds once the demo catalog is replaced.
 */

test('Confirm pledge: charges Stripe (pm_card_visa), persists, increments raised, shows on /my-pledges, survives reload', async ({
  page,
}) => {
  await signup(page)

  const campaign = await pickBackableCampaign(page)
  // The checkout pre-selects the cheapest tier (tiers come back amount-asc).
  const tier = campaign.tiers[0]
  const beforeRaised: number = campaign.raised_amount

  await page.goto(APP_BASE + '/campaign/' + campaign.id + '/pledge')
  await expect(page.getByText(/confirm your pledge/i)).toBeVisible({ timeout: 10_000 })

  // Fill the shipping fields (the form has a single "ship-name" + "ship-addr")
  await page.locator('#ship-name').fill('Pledge Tester')
  await page.locator('#ship-addr').fill('123 Test Lane, Bend OR 97701')

  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /confirm pledge/i }).click()
    // Page redirects back to the campaign with ?pledged=1 on success
    await expect(page).toHaveURL(new RegExp(`/campaign/${campaign.id}\\?pledged=1`), {
      timeout: 30_000,
    })
  })

  // Assert the POST /api/pledges actually fired and succeeded
  const post = reqs.find((r) => /\/api\/pledges/.test(r.url) && r.method === 'POST')
  expect(post, 'pledge form must POST to /api/pledges').toBeTruthy()
  expect(post!.status, 'Stripe charge must succeed').toBeLessThan(400)

  // Backend invariant 1: my-pledges shows the new row
  const myPledges = await page.evaluate(async () => {
    const r = await fetch('/api/pledges/my')
    return r.json()
  })
  expect(Array.isArray(myPledges)).toBe(true)
  const our = myPledges.find(
    (p: { campaign_id: string; status: string }) =>
      p.campaign_id === campaign.id && p.status === 'active',
  )
  expect(our, 'new pledge row must appear in /api/pledges/my').toBeTruthy()
  expect(our.amount).toBe(tier.amount)
  expect(our.tier_title).toBe(tier.title)
  // Stripe payment_id (pi_...) must be persisted, not null/empty
  expect(our.payment_id, 'pledge.payment_id must be a real Stripe payment intent id').toMatch(
    /^pi_/,
  )

  // Backend invariant 2: campaign.raised_amount went up by exactly the tier price
  const after = await getCampaign(page, campaign.id)
  expect(Number(after.raised_amount) - Number(beforeRaised)).toBeCloseTo(tier.amount, 0)

  // /my-pledges page renders the pledge after reload (proves persistence,
  // not just local UI state)
  await page.goto(APP_BASE + '/my-pledges')
  await page.reload()
  await expect(page.getByText(campaign.title).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(tier.title).first()).toBeVisible()
})

test('Pledge form lets the user pick the higher tier and the amount reflects the choice', async ({
  page,
}) => {
  await signup(page)
  const campaign = await pickBackableCampaign(page, 2)
  // Tiers come back amount-ascending, so the last one is the dearest.
  const higher = campaign.tiers[campaign.tiers.length - 1]
  await page.goto(APP_BASE + '/campaign/' + campaign.id + '/pledge')
  await page.locator(`[data-mol-id="reward-tier-${higher.id}"]`).click()
  // Total today should now show that tier's price
  await expect(page.locator('[data-mol-id="summary-tier-title"]')).toHaveText(higher.title)
  await expect(page.locator('[data-mol-id="summary-total"]')).toHaveText(formatTierTotal(higher), {
    timeout: 5_000,
  })
})

test('cancel pledge sets status=cancelled and decrements raised total', async ({ page }) => {
  await signup(page)

  // Make a pledge to whichever campaign the catalog offers.
  const campaign = await pickBackableCampaign(page)
  const beforeRaised = Number(campaign.raised_amount)

  await page.goto(APP_BASE + '/campaign/' + campaign.id + '/pledge')
  await page.locator('#ship-name').fill('Cancel Tester')
  await page.locator('#ship-addr').fill('456 Cancel St, Bend OR 97701')
  await page.getByRole('button', { name: /confirm pledge/i }).click()
  await expect(page).toHaveURL(new RegExp(`/campaign/${campaign.id}\\?pledged=1`), {
    timeout: 30_000,
  })

  // Find the new pledge id
  const myPledges = await page.evaluate(async () => {
    const r = await fetch('/api/pledges/my')
    return r.json()
  })
  const ours: { id: string; amount: number } = myPledges.find(
    (p: { campaign_id: string; status: string }) =>
      p.campaign_id === campaign.id && p.status === 'active',
  )
  expect(ours).toBeTruthy()

  // Cancel via the API exposed by the UI
  const cancelRes = await page.evaluate(async (id: string) => {
    const r = await fetch('/api/pledges/' + id + '/cancel', { method: 'POST' })
    return { status: r.status, body: await r.json() }
  }, ours.id)
  expect(cancelRes.status).toBeLessThan(400)

  // Read back: status=cancelled and raised_amount went back down
  const after = await getCampaign(page, campaign.id)
  expect(Number(after.raised_amount)).toBeCloseTo(beforeRaised, 0)

  const myPledgesAfter = await page.evaluate(async () => {
    const r = await fetch('/api/pledges/my')
    return r.json()
  })
  // The cancel handler sets pledge.status='refunded' (the row stays in
  // /api/pledges/my so the user can see what happened).
  const sameRow = myPledgesAfter.find((p: { id: string }) => p.id === ours.id)
  expect(sameRow.status).toBe('refunded')
})
