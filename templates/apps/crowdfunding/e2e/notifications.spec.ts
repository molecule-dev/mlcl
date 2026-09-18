import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, pickCampaignWithUpdate, signup } from './_helpers'

/**
 * /notifications — derived feed. After making a pledge, a
 * "campaign_update" entry should be visible for a campaign whose creator
 * has published an update. The page also auto-marks all rows as read via
 * POST /api/notifications/mark-read.
 *
 * The campaign and update are read from the live catalog, not named.
 */

test('Empty state for a user with no pledges and no campaigns', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('[data-mol-id="notif-empty"]')).toBeVisible()
})

test('After backing a campaign, the notifications feed includes its creator update', async ({
  page,
}) => {
  await signup(page)
  // Back a campaign that has published an update, so the derived feed has a
  // campaign_update row to show.
  const { campaign, update } = await pickCampaignWithUpdate(page)
  await page.goto(APP_BASE + '/campaign/' + campaign.id + '/pledge')
  await page.locator('#ship-name').fill('Notif Tester')
  await page.locator('#ship-addr').fill('500 Test Way, Bend OR 97701')
  await page.getByRole('button', { name: /confirm pledge/i }).click()
  await expect(page).toHaveURL(new RegExp(`/campaign/${campaign.id}\\?pledged=1`), {
    timeout: 30_000,
  })

  // Now visit /notifications
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByText(update.title).first()).toBeVisible({ timeout: 10_000 })
})

test('POST /api/notifications/mark-read flips unread_count to 0 on next read', async ({ page }) => {
  await signup(page)
  await page.evaluate(async () => {
    const r = await fetch('/api/notifications/mark-read', { method: 'POST' })
    return r.json()
  })
  const after = await page.evaluate(async () => {
    const r = await fetch('/api/notifications')
    return r.json()
  })
  expect(after.unread_count).toBe(0)
})
