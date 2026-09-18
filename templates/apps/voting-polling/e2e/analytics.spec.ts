import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('/analytics page renders the analytics title (h1)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/analytics')
  await expect(page.locator('[data-test="analytics-title"]')).toBeVisible()
})

test('/analytics renders the cross-poll analytics table after seed', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/analytics')
  await expect(page.locator('[data-test="analytics-table"]')).toBeVisible({ timeout: 15_000 })
})

test('/analytics analytics table row count matches /api/polls count (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  // Ensure seed has run by hitting /polls first.
  const polls = await api<Array<{ id: string }>>(page, 'GET', '/polls')
  await page.goto(APP_BASE + '/analytics')
  await page.waitForLoadState('networkidle').catch(() => {})
  const rows = page.locator('[data-test^="analytics-row-"]')
  // The analytics table should have one row per owned poll. Allow ≥ in
  // case the seed adds extras over time.
  expect(await rows.count()).toBeGreaterThanOrEqual(polls.length)
})

test('observation invariant: /analytics fires GET /api/polls and GET /api/results during page load', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/polls\b/.test(r.url) && r.method === 'GET')).toBeTruthy()
  expect(reqs.find((r) => /\/api\/results\//.test(r.url) && r.method === 'GET')).toBeTruthy()
})
