import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

/**
 * /campaign/new — multi-step wizard. Final "Publish" issues
 * POST /api/campaigns then POST /api/tiers (one per tier) then
 * POST /api/campaigns/:id/publish, and navigates to /campaign/:id/manage.
 *
 * Past failure mode: a "publish" button that just navigates without any
 * backend mutation. We assert (a) the network call shape, (b) the
 * campaign appears on /api/campaigns, AND (c) reload-back from /manage
 * still finds it.
 */

test('Wizard creates a draft → tier → publishes → lands on /campaign/:id/manage', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/campaign/new')

  // STEP: basics
  await expect(page.getByText(/set the stage for your launch/i)).toBeVisible({ timeout: 10_000 })
  const uniqueTitle = 'CF Test Campaign ' + Date.now()
  await page.locator('#title').fill(uniqueTitle)
  await page.locator('#tagline').fill('A small useful thing.')
  await page.locator('#goal').fill('5000')
  await page.locator('#duration').fill('30')
  await page.locator('[data-mol-id="editor-next"]').click()

  // STEP: rewards — first tier already has an empty row
  await expect(page.locator('[data-mol-id="editor-tiers"]')).toBeVisible({ timeout: 5_000 })
  await page.locator('#tier-title-0').fill('Founding Backer')
  await page.locator('#tier-amount-0').fill('99')
  await page.locator('#tier-desc-0').fill('Numbered, signed.')
  await page.locator('[data-mol-id="editor-next"]').click()

  // STEP: story
  await page
    .locator('[data-mol-id="editor-story"]')
    .fill('Why it matters: it just does. Backers will be delighted.')
  await page.locator('[data-mol-id="editor-next"]').click()

  // STEP: review → Publish
  await expect(page.locator('[data-mol-id="editor-review"]')).toBeVisible()
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="editor-next"]').click()
    await expect(page).toHaveURL(/\/campaign\/[0-9a-f-]+\/manage/, { timeout: 30_000 })
  })

  // Assert the network shape
  const createCampaign = reqs.find(
    (r) => /\/api\/campaigns(\?|$)/.test(r.url) && r.method === 'POST',
  )
  expect(createCampaign, 'wizard must POST /api/campaigns').toBeTruthy()
  expect(createCampaign!.status).toBeLessThan(400)
  const createTier = reqs.find((r) => /\/api\/tiers(\?|$)/.test(r.url) && r.method === 'POST')
  expect(createTier, 'wizard must POST /api/tiers').toBeTruthy()
  expect(createTier!.status).toBeLessThan(400)
  const publish = reqs.find(
    (r) => /\/api\/campaigns\/[0-9a-f-]+\/publish/.test(r.url) && r.method === 'POST',
  )
  expect(publish, 'wizard must POST /api/campaigns/:id/publish').toBeTruthy()
  expect(publish!.status).toBeLessThan(400)

  // Backend invariant: the new campaign is in /api/campaigns?status=active
  const list = await page.evaluate(async () => {
    const r = await fetch('/api/campaigns?status=active&page=1&limit=100')
    return r.json()
  })
  const arr: Array<{ title: string; status: string }> = Array.isArray(list)
    ? list
    : (list.data ?? list.items ?? [])
  expect(arr.find((c) => c.title === uniqueTitle)).toBeTruthy()

  // Reload the manage page → still alive
  await page.reload()
  await expect(page.getByText(/CF Test Campaign/).first()).toBeVisible({ timeout: 10_000 })
})

test('Wizard rejects empty title (cannot advance past basics)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/campaign/new')
  await page.locator('[data-mol-id="editor-next"]').click()
  await expect(page.locator('[data-mol-id="editor-error"]')).toBeVisible({ timeout: 5_000 })
})
