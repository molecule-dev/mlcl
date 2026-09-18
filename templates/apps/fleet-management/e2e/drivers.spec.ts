import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoDrivers(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/drivers')
  await expect(page.getByRole('heading', { name: /^drivers$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('drivers', () => {
  test('list page renders seeded drivers and GET /api/drivers returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoDrivers(page)
    })
    const driversReq = reqs.find((r) => /\/api\/drivers(\?|$)/.test(r.url) && r.method === 'GET')
    expect(driversReq?.status, 'GET /api/drivers').toBe(200)
    await expect(page.getByText(/\d+ drivers in fleet/i)).toBeVisible()
    const detailLinks = page.locator('a[href^="/drivers/"]')
    await expect.poll(() => detailLinks.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('page heading "Drivers" renders', async ({ page }) => {
    await signup(page)
    await gotoDrivers(page)
    await expect(page.getByRole('heading', { name: /^drivers$/i, level: 1 })).toBeVisible()
  })

  test('"+ Add driver" creates a row that survives page reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDrivers(page)

    const name = `E2E Tester ${Date.now() % 100000}`
    await page.getByRole('button', { name: /\+ add driver/i }).click()
    await page.getByLabel(/^name$/i).fill(name)
    await page.getByLabel(/^email$/i).fill(`e2e+${Date.now()}@flagship.test`)
    await page.getByRole('button', { name: /^add driver$/i }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })
    await page.reload()
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })
  })

  test('first driver card link navigates to /drivers/<uuid>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDrivers(page)
    await page.locator('a[href^="/drivers/"]').first().click()
    await expect(page).toHaveURL(/\/drivers\/[a-f0-9-]{36}$/)
  })

  test('driver card status badge renders one of {on duty, on break, off duty}', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDrivers(page)
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).toMatch(/on duty|on break|off duty/i)
  })

  test('driver card "Safety NN" stat renders numeric score', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDrivers(page)
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'safety score numeric').toMatch(/safety\s*\d+/i)
  })

  test('detail page renders driver KPIs and recent trips list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDrivers(page)
    await page.locator('a[href^="/drivers/"]').first().click()
    await expect(page).toHaveURL(/\/drivers\/[a-f0-9-]{36}$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/safety score/i)).toBeVisible()
    await expect(page.getByText(/total miles/i)).toBeVisible()
    await expect(page.getByText(/recent trips/i)).toBeVisible()
  })
})
