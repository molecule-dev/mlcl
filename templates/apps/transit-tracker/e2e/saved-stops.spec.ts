import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getSampleStop,
  saveStop,
  signup,
} from './_helpers.js'

test.describe('/saved (SavedStops) page', () => {
  test('empty state links to /nearby', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/saved')
    await page.waitForTimeout(1200)
    await expect(page.locator('[data-mol-id="saved-browse-link"]')).toBeVisible()
    await page.locator('[data-mol-id="saved-browse-link"]').click()
    await expect(page).toHaveURL(/\/nearby$/)
  })

  test('shows saved stops saved from a board and unsave removes one (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const stop = await getSampleStop(page)
    await saveStop(page, accessToken, stop.code)

    await page.goto(APP_BASE + '/saved')
    await page.waitForTimeout(1200)
    await expect(page.locator(`[data-mol-id="saved-stop-${stop.code}"]`)).toBeVisible()

    const reqs = await captureNetwork(page, async () => {
      await page.locator(`[data-mol-id="saved-unsave-${stop.code}"]`).click()
      await page.waitForTimeout(1000)
    })
    const del = reqs.find((r) => r.method() === 'DELETE' && /\/api\/saved-stops\//.test(r.url))
    expect(del, 'DELETE /api/saved-stops/:code').toBeTruthy()
    expect(del?.status).toBeLessThan(400)

    const afterRes = await page.request.get('/api/saved-stops', {
      headers: apiHeaders(accessToken),
    })
    const rows = (await afterRes.json()) as Array<{ code: string }>
    expect(rows.some((r) => r.code === stop.code)).toBe(false)
  })
})
