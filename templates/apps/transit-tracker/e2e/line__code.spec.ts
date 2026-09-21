import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getSampleLine, signup } from './_helpers.js'

test.describe('/lines/:code (RouteDetail) page', () => {
  test('renders the line map, schedule windows, and the ordered stop list', async ({ page }) => {
    await signup(page)
    const line = await getSampleLine(page)
    await page.goto(APP_BASE + `/lines/${line.code}`)
    await page.waitForTimeout(1500)

    // The line's own name (read from the API) heads the page.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(line.name)
    // Static SVG route diagram renders with the line's geometry.
    await expect(page.locator('[data-mol-id="line-map"]')).toBeVisible()
    // Both direction schedule cards render.
    expect(await page.locator('[data-mol-id="line-schedules"] > div').count()).toBe(2)
    // Every stop of the line links to its board.
    for (const code of line.stops) {
      expect(
        await page.locator(`[data-mol-id="line-stop-link-${code}"]`).count(),
        `stop ${code} listed`,
      ).toBeGreaterThan(0)
    }
  })

  test('clicking a stop in the list opens its board', async ({ page }) => {
    await signup(page)
    const line = await getSampleLine(page)
    const stopCode = line.stops[0]
    await page.goto(APP_BASE + `/lines/${line.code}`)
    await page.waitForTimeout(1500)
    await page.locator(`[data-mol-id="line-stop-link-${stopCode}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/stops/${stopCode}$`))
  })

  test('unknown line code renders the not-found state', async ({ page }) => {
    // A nonexistent code legitimately 404s on /api/network/lines/:code —
    // the browser logs the failed loads and the page's own [RouteDetail]
    // handler before rendering the not-found state. Expected, so allow
    // them before they fire.
    ;['Failed to load resource.*404', '\\[RouteDetail\\]'].forEach((description) => {
      test.info().annotations.push({ type: 'allow-console-error', description })
    })
    await signup(page)
    await page.goto(APP_BASE + '/lines/ZZ')
    await page.waitForTimeout(1500)
    await expect(page.getByText(/line not found/i).first()).toBeVisible()
  })
})
