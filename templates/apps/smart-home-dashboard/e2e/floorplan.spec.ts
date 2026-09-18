import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/floorplan', () => {
  test('floorplan page renders for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/floorplan')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('floorplan render is non-empty and the page loads without backend errors', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/floorplan')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    // Whatever the floorplan fetches at mount, none of it should 5xx
    const fail5xx = reqs.filter((r) => r.url.includes('/api/') && r.status >= 500)
    expect(fail5xx, 'no 5xx errors during /floorplan mount').toEqual([])
    const body = await page.locator('body').textContent()
    expect(body!.length, 'floorplan is not blank').toBeGreaterThan(50)
  })

  test('navigating from /floorplan back to /overview works', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/floorplan')
    await page.goto(APP_BASE + '/overview')
    await expect(page).toHaveURL(/\/overview/)
  })
})
