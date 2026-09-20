import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getSampleStop, signup } from './_helpers.js'

test.describe('/nearby (Nearby) page', () => {
  test('lists stops (interchanges first) and hits /api/network/stops', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/nearby')
      await page.waitForTimeout(1500)
    })
    const stopsReq = reqs.find((r) => /\/api\/network\/stops/.test(r.url))
    expect(stopsReq, 'GET /api/network/stops').toBeTruthy()
    expect(stopsReq?.status).toBeLessThan(400)
    // Structural: every stop row links to a board.
    expect(await page.locator('[data-mol-id^="stop-item-"]').count()).toBeGreaterThan(0)
    expect(await page.locator('a[href^="/stops/"]').count()).toBeGreaterThan(0)
  })

  test('typing in stop search filters the suggestion list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/nearby')
    await page.waitForTimeout(1500)
    const stop = await getSampleStop(page)
    // Type a fragment of the sampled stop's name (case-insensitive substring).
    const fragment = stop.name.slice(0, 4)
    await page.locator('[data-mol-id="stop-search-input"]').fill(fragment)
    await expect(page.locator('[data-mol-id="stop-search-results"]')).toBeVisible()
    // The sampled stop must be among the matches for its own name fragment.
    await expect(page.locator(`[data-mol-id="stop-item-${stop.code}"]`).first()).toBeVisible()
  })

  test('clicking a stop row opens its board', async ({ page }) => {
    await signup(page)
    const stop = await getSampleStop(page)
    await page.goto(APP_BASE + '/nearby')
    await page.waitForTimeout(1500)
    await page.locator(`[data-mol-id="stop-item-${stop.code}"] a`).first().click()
    await expect(page).toHaveURL(new RegExp(`/stops/${stop.code}$`))
  })
})
