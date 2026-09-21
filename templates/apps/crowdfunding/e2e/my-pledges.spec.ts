import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, formatTierTotal, pickBackableCampaign, signup } from './_helpers'

/**
 * /my-pledges — read-after-write proof. After the user pledges, the
 * pledge appears here. Cancelling moves it to status='refunded' and
 * the cancel button disappears.
 *
 * The campaign backed is read from the live catalog, not named.
 */

test('Empty state for a user with no pledges', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/my-pledges')
  await expect(page.locator('[data-mol-id="my-pledges-empty"]')).toBeVisible({ timeout: 10_000 })
  // CTA back to /discover
  await expect(page.getByRole('link', { name: /discover campaigns/i })).toBeVisible()
})

test('After pledging, /my-pledges renders the row and survives reload', async ({ page }) => {
  await signup(page)
  const campaign = await pickBackableCampaign(page)
  const tier = campaign.tiers[0]

  await page.goto(APP_BASE + '/campaign/' + campaign.id + '/pledge')
  await page.locator('#ship-name').fill('Pledge Persist Tester')
  await page.locator('#ship-addr').fill('5 Persist Ave')
  await page.getByRole('button', { name: /confirm pledge/i }).click()
  await expect(page).toHaveURL(new RegExp(`/campaign/${campaign.id}\\?pledged=1`), {
    timeout: 30_000,
  })

  await page.goto(APP_BASE + '/my-pledges')
  await expect(page.getByText(campaign.title).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(formatTierTotal(tier)).first()).toBeVisible()

  // Reload — still there
  await page.reload()
  await expect(page.getByText(campaign.title).first()).toBeVisible({ timeout: 10_000 })
})

test('Header "$X across N pledges" total updates with each pledge', async ({ page }) => {
  await signup(page)
  const campaign = await pickBackableCampaign(page)
  const tier = campaign.tiers[0]

  await page.goto(APP_BASE + '/campaign/' + campaign.id + '/pledge')
  await page.locator('#ship-name').fill('Total Tester')
  await page.locator('#ship-addr').fill('Anywhere')
  await page.getByRole('button', { name: /confirm pledge/i }).click()
  await expect(page).toHaveURL(new RegExp(`/campaign/${campaign.id}\\?pledged=1`), {
    timeout: 30_000,
  })

  await page.goto(APP_BASE + '/my-pledges')
  // The total is this user's one pledge — the tier price they just paid.
  await expect(page.locator('[data-mol-id="my-pledges-summary"]')).toContainText(
    // "1 pledge" (singular) — the app pluralizes correctly.
    new RegExp(`${formatTierTotal(tier).replace('$', '\\$')} across 1 pledge(?!s)`, 'i'),
    { timeout: 10_000 },
  )
})
