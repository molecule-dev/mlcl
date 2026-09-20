import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getBoard,
  getSampleStop,
  signup,
} from './_helpers.js'

test.describe('/stops/:code (StopBoard) — the signature screen', () => {
  test('renders the board: header, arrivals rows, refresh control', async ({ page }) => {
    await signup(page)
    const stop = await getSampleStop(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/stops/${stop.code}`)
      await page.waitForTimeout(1500)
    })
    const boardReq = reqs.find((r) => /\/api\/arrivals\//.test(r.url))
    expect(boardReq, 'GET /api/arrivals/:code').toBeTruthy()
    expect(boardReq?.status).toBeLessThan(400)

    // The stop's own name (read from the API) heads the board.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(stop.name)
    await expect(page.locator('[data-mol-id="board-refresh"]')).toBeVisible()

    // Board rows render as arrival list items; count matches the API's rows.
    const arrivals = await getBoard(page, stop.code)
    const rowCount = await page.locator('[data-mol-id^="arrival-"]').count()
    expect(rowCount).toBe(arrivals.length)
  })

  test('refresh button re-requests the arrivals feed', async ({ page }) => {
    await signup(page)
    const stop = await getSampleStop(page)
    await page.goto(APP_BASE + `/stops/${stop.code}`)
    await page.waitForTimeout(1500)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="board-refresh"]').click()
      await page.waitForTimeout(800)
    })
    expect(reqs.some((r) => /\/api\/arrivals\//.test(r.url))).toBe(true)
  })

  test('save stop persists (read-after-write) and unsave removes it', async ({ page }) => {
    const { accessToken } = await signup(page)
    const stop = await getSampleStop(page)
    await page.goto(APP_BASE + `/stops/${stop.code}`)
    await page.waitForTimeout(1500)

    await page.locator('[data-mol-id="stop-save-toggle"]').click()
    await expect(
      page.locator('[data-mol-id="stop-save-toggle"][aria-pressed="true"]'),
    ).toBeVisible()

    // Read-after-write: the saved-stops API now contains this stop.
    const listRes = await page.request.get(`/api/saved-stops`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(listRes.ok()).toBe(true)
    const rows = (await listRes.json()) as Array<{ code: string }>
    expect(rows.some((r) => r.code === stop.code)).toBe(true)

    await page.locator('[data-mol-id="stop-save-toggle"]').click()
    await expect(
      page.locator('[data-mol-id="stop-save-toggle"][aria-pressed="false"]'),
    ).toBeVisible()
    const afterRes = await page.request.get(`/api/saved-stops`, {
      headers: apiHeaders(accessToken),
    })
    const afterRows = (await afterRes.json()) as Array<{ code: string }>
    expect(afterRows.some((r) => r.code === stop.code)).toBe(false)
  })

  test('unknown stop code renders the not-found state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/stops/ZZZZ')
    await page.waitForTimeout(1500)
    await expect(page.getByText(/stop not found/i).first()).toBeVisible()
  })
})
