import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoTrips(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/trips')
  await expect(page.getByRole('heading', { name: /^trips$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('trips (trip log)', () => {
  test('eyebrow "Trip log" renders above the heading', async ({ page }) => {
    await signup(page)
    await gotoTrips(page)
    await expect(page.getByText(/^trip log$/i)).toBeVisible()
  })

  test('page heading "Trips" renders', async ({ page }) => {
    await signup(page)
    await gotoTrips(page)
    await expect(page.getByRole('heading', { name: /^trips$/i, level: 1 })).toBeVisible()
  })

  test('subheader "Last 30 days · N trips" reflects trip count', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByText(/last 30 days · \d+ trips/i)).toBeVisible({ timeout: 10000 })
  })

  test('total miles chip renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByText(/\d+(,\d+)? mi total/i)).toBeVisible({ timeout: 10000 })
  })

  test('total fuel chip renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByText(/[\d.]+ gal fuel/i)).toBeVisible({ timeout: 10000 })
  })

  test('GET /api/trips returns 200 on mount', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoTrips(page)
    })
    const tripsReq = reqs.find((r) => /\/api\/trips(\?|$)/.test(r.url) && r.method === 'GET')
    expect(tripsReq?.status, 'GET /api/trips').toBe(200)
  })

  test('trips table renders with at least one row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    const firstRow = page.getByRole('row').nth(1)
    await expect(firstRow).toBeVisible({ timeout: 10000 })
  })

  test('Date column header renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByRole('columnheader', { name: /^date$/i })).toBeVisible()
  })

  test('Route column header renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByRole('columnheader', { name: /^route$/i })).toBeVisible()
  })

  test('first row Route cell shows non-empty origin → destination', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    const firstRow = page.getByRole('row').nth(1)
    const routeCell = firstRow.locator('td').nth(3)
    const routeText = ((await routeCell.textContent()) ?? '').trim()
    expect(routeText, 'route cell').not.toEqual('→')
    expect(routeText, 'route cell').toMatch(/.+ → .+/)
  })

  test('first row Miles cell renders a number', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    const firstRow = page.getByRole('row').nth(1)
    const txt = (await firstRow.textContent()) ?? ''
    expect(txt).toMatch(/\d+/)
  })

  test('first row Duration cell renders "Nh Mm" format', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    const firstRow = page.getByRole('row').nth(1)
    const txt = (await firstRow.textContent()) ?? ''
    expect(txt).toMatch(/\d+h \d+m/)
  })

  test('first row Events cell renders either a chip or "—"', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTrips(page)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    const firstRow = page.getByRole('row').nth(1)
    const txt = (await firstRow.textContent()) ?? ''
    // Either a numeric events chip OR an em-dash placeholder.
    expect(/\d+ event|—/i.test(txt), 'events cell shape').toBe(true)
  })
})
