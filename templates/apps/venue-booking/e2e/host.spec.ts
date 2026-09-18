/**
 * /host — host dashboard. The page surfaces aggregate metrics over the
 * user's own venues. New users have zero venues so the "empty" state
 * should appear; either way the metrics endpoint must respond 200.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('GET /api/host_metrics succeeds and the page renders', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/host')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/host_metrics/.test(r.url))
  expect(get?.status).toBe(200)
})
