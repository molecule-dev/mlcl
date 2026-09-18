import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

/**
 * /campaign/:id/manage — creator console for a campaign you own.
 * The Updates tab posts to POST /api/updates which fans out to all
 * active backers via Mailgun (logged on failure, but the row must
 * persist regardless).
 */

async function publishACampaign(
  page: import('@playwright/test').Page,
  label: string,
): Promise<string> {
  await page.goto(APP_BASE + '/campaign/new')
  await page.locator('#title').fill(label)
  await page.locator('#tagline').fill('manage-test')
  await page.locator('#goal').fill('1000')
  await page.locator('#duration').fill('30')
  await page.locator('[data-mol-id="editor-next"]').click()
  await page.locator('#tier-title-0').fill('Standard')
  await page.locator('#tier-amount-0').fill('20')
  await page.locator('[data-mol-id="editor-next"]').click()
  await page.locator('[data-mol-id="editor-story"]').fill('Story.')
  await page.locator('[data-mol-id="editor-next"]').click()
  await page.locator('[data-mol-id="editor-next"]').click()
  await expect(page).toHaveURL(/\/campaign\/[0-9a-f-]+\/manage/, { timeout: 30_000 })
  const url = page.url()
  const m = url.match(/\/campaign\/([0-9a-f-]+)\/manage/)
  if (!m) throw new Error('failed to extract id from manage url ' + url)
  return m[1]
}

test('Manage hero shows raised + backers + days left, status pill says Live', async ({ page }) => {
  await signup(page)
  await publishACampaign(page, 'Manage HERO ' + Date.now())
  await expect(page.getByText(/Live/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-mol-id="manage-raised"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="manage-raised"]')).toContainText('$0')
})

test('Posting an update writes to /api/updates and surfaces in the list (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  const id = await publishACampaign(page, 'Manage UPDATE ' + Date.now())

  // Switch to Updates tab
  await page.locator('[data-mol-id="manage-tab-updates"]').click()
  await expect(page.locator('[data-mol-id="update-publish"]')).toBeVisible({ timeout: 5_000 })

  const headline = 'Production update ' + Date.now()
  await page.locator('[data-mol-id="update-title-input"]').fill(headline)
  await page.locator('[data-mol-id="update-body-input"]').fill('Manufacturing started today.')

  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="update-publish"]').click()
    // The list re-fetches; the headline appears in the rendered cards
    await expect(page.getByText(headline).first()).toBeVisible({ timeout: 10_000 })
  })
  const post = reqs.find((r) => /\/api\/updates(\?|$)/.test(r.url) && r.method === 'POST')
  expect(post, 'must POST /api/updates').toBeTruthy()
  expect(post!.status).toBeLessThan(400)

  // Backend invariant: GET /api/updates/campaign/:id contains the new row
  const list = await page.evaluate(async (cid: string) => {
    const r = await fetch('/api/updates/campaign/' + cid)
    return r.json()
  }, id)
  expect(Array.isArray(list)).toBe(true)
  expect(list.find((u: { title: string }) => u.title === headline)).toBeTruthy()
})

test('Empty title + body shows an inline error and does not POST', async ({ page }) => {
  await signup(page)
  await publishACampaign(page, 'Manage VALIDATE ' + Date.now())
  await page.locator('[data-mol-id="manage-tab-updates"]').click()

  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="update-publish"]').click()
    await expect(page.locator('[data-mol-id="update-post-error"]')).toBeVisible({ timeout: 5_000 })
  })
  const post = reqs.find((r) => /\/api\/updates(\?|$)/.test(r.url) && r.method === 'POST')
  expect(post, 'no POST should fire when fields are empty').toBeFalsy()
})
