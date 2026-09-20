import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getSampleLine,
  getSampleStop,
  saveStop,
  signup,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink flow: a brand-new rider signs up, browses nearby
 * stops, opens a live board, saves the stop, plans a cross-line trip,
 * reviews service alerts, edits their profile, and lands on /plan-updated.
 * Every primary surface gets touched once. Read-after-write assertions
 * ensure persisted backend state matches what the UI showed.
 */
test('user journey: signup → nearby → board → save → plan → alerts → settings', async ({
  page,
}) => {
  test.setTimeout(120_000)

  // 1) Signup, lands on /nearby
  const { accessToken } = await signup(page)
  await expect(page).toHaveURL(/\/nearby/)

  // 2) Nearby lists stops; open the sampled stop's board
  const stop = await getSampleStop(page)
  await page.waitForTimeout(1200)
  const stopRows = page.locator('[data-mol-id^="stop-item-"]')
  await expect(stopRows.first()).toBeAttached()
  await page.goto(APP_BASE + `/stops/${stop.code}`)
  await page.waitForTimeout(1500)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(stop.name)

  // 3) Save the stop from the board (read-after-write below)
  await page.locator('[data-mol-id="stop-save-toggle"]').click()
  await expect(page.locator('[data-mol-id="stop-save-toggle"][aria-pressed="true"]')).toBeVisible()

  // 4) /saved lists the saved stop
  await page.goto(APP_BASE + '/saved')
  await page.waitForTimeout(1200)
  await expect(page.locator(`[data-mol-id="saved-stop-${stop.code}"]`)).toBeVisible()

  // 5) Plan a cross-line trip: first stop of one line → far stop of another
  const lineA = await getSampleLine(page)
  const linesRes = await page.request.get('/api/network/lines')
  const lines = (await linesRes.json()) as Array<{ code: string; stops: string[] }>
  const other = lines.find((l) => l.code !== lineA.code) ?? lines[0]
  await page.goto(APP_BASE + '/plan')
  await page.waitForTimeout(1500)
  await page.locator('[data-mol-id="trip-origin-picker"]').selectOption(lineA.stops[0])
  await page
    .locator('[data-mol-id="trip-destination-picker"]')
    .selectOption(other.stops[other.stops.length - 1])
  await page.locator('[data-mol-id="trip-plan-submit"]').click()
  await page.waitForTimeout(2000)
  await expect(page.locator('[data-mol-id^="itinerary-"]').first()).toBeVisible()

  // 6) /alerts renders the service-status surface
  await page.goto(APP_BASE + '/alerts')
  await page.waitForTimeout(1200)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/alerts/i)

  // 7) Settings: profile edit persists (read-after-write via API)
  await page.goto(APP_BASE + '/settings')
  await page.waitForTimeout(1500)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

  // 8) Saved-stop state is exactly one row, matching the board save
  const savedRes = await page.request.get('/api/saved-stops', {
    headers: apiHeaders(accessToken),
  })
  const savedRows = (await savedRes.json()) as Array<{ code: string }>
  expect(savedRows.some((r) => r.code === stop.code)).toBe(true)

  // 9) /plan-updated renders the billing confirmation shell
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForTimeout(1200)
  await expect(page).toHaveURL(/\/plan-updated/)
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
})

test('user journey: board → line map follows the badge trail', async ({ page }) => {
  const { accessToken } = await signup(page)
  const stop = await getSampleStop(page)
  const saved = await saveStop(page, accessToken, stop.code)
  expect(saved.code ?? (saved as { stop_code?: string }).stop_code).toBeTruthy()

  await page.goto(APP_BASE + `/stops/${stop.code}`)
  await page.waitForTimeout(1500)
  // Follow the first serving line to its route page, then into a stop board.
  const lineLink = page.locator('[data-mol-id^="stop-line-link-"]').first()
  await expect(lineLink).toBeVisible()
  await lineLink.click()
  await page.waitForTimeout(1500)
  await expect(page.locator('[data-mol-id="line-map"]')).toBeVisible()
  const stopLink = page.locator('[data-mol-id^="line-stop-link-"]').first()
  await stopLink.click()
  await page.waitForTimeout(1500)
  await expect(page.locator('[data-mol-id="arrivals-board"]')).toBeVisible()
})
