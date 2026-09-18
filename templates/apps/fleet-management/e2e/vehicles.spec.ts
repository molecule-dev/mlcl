import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoVehicles(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/vehicles')
  await expect(page.getByRole('heading', { name: /^vehicles$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('vehicles', () => {
  test('list page renders seeded fleet and GET /api/vehicles returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoVehicles(page)
    })
    const vehiclesReq = reqs.find((r) => /\/api\/vehicles(\?|$)/.test(r.url) && r.method === 'GET')
    expect(vehiclesReq?.status, 'GET /api/vehicles').toBe(200)
    const detailLinks = page.locator('a[href^="/vehicles/"]')
    await expect.poll(() => detailLinks.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('page heading "Vehicles" renders', async ({ page }) => {
    await signup(page)
    await gotoVehicles(page)
    await expect(page.getByRole('heading', { name: /^vehicles$/i, level: 1 })).toBeVisible()
  })

  test('search box (plate or driver) is interactive', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoVehicles(page)
    const search = page.getByRole('searchbox')
    await expect(search).toBeVisible()
    await search.fill('test')
    await expect(search).toHaveValue('test')
  })

  test('"Operational" filter button is present', async ({ page }) => {
    await signup(page)
    await gotoVehicles(page)
    await expect(page.getByRole('button', { name: /^operational$/i })).toBeVisible()
  })

  test('"In transit" filter button is present', async ({ page }) => {
    await signup(page)
    await gotoVehicles(page)
    await expect(page.getByRole('button', { name: /^in transit$/i })).toBeVisible()
  })

  test('"+ Add vehicle" creates a row that survives page reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoVehicles(page)

    const plate = `E2E-${Date.now() % 100000}`
    await page.getByRole('button', { name: /\+ add vehicle/i }).click()
    await page.getByLabel(/license plate/i).fill(plate)
    await page.getByLabel(/^make$/i).fill('Acme')
    await page.getByLabel(/^model$/i).fill('SmokeTest')
    await page.getByLabel(/^year$/i).fill('2026')
    await page.getByRole('button', { name: /^add vehicle$/i }).click()

    await expect(page.getByRole('link', { name: plate })).toBeVisible({ timeout: 10000 })
    await page.reload()
    await expect(page.getByRole('link', { name: plate })).toBeVisible({ timeout: 10000 })
  })

  test('first vehicle row plate link navigates to /vehicles/<uuid>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoVehicles(page)
    await page.locator('a[href^="/vehicles/"]').first().click()
    await expect(page).toHaveURL(/\/vehicles\/[a-f0-9-]{36}$/)
  })

  test('detail page renders vehicle KPIs and recent trips list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoVehicles(page)
    await page.locator('a[href^="/vehicles/"]').first().click()
    await expect(page).toHaveURL(/\/vehicles\/[a-f0-9-]{36}$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/odometer/i)).toBeVisible()
    await expect(page.getByText(/^fuel$/i)).toBeVisible()
    await expect(page.getByText(/recent trips/i)).toBeVisible()
  })

  test('search box narrows visible rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoVehicles(page)
    const initial = await page.locator('a[href^="/vehicles/"]').count()
    expect(initial).toBeGreaterThanOrEqual(1)
    await page.getByRole('searchbox').fill('zzzzz-no-match-zzzzz')
    await expect
      .poll(async () => page.locator('a[href^="/vehicles/"]').count(), { timeout: 5000 })
      .toBe(0)
  })
})
