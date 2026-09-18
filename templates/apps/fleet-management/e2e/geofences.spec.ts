import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoGeofences(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/geofences')
  await expect(page.getByRole('heading', { name: /^geofences$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('geofences', () => {
  test('list page loads and GET /api/geofences returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoGeofences(page)
    })
    const req = reqs.find((r) => /\/api\/geofences(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/geofences').toBe(200)
    await expect(page.getByText(/\d+ zones/i)).toBeVisible()
  })

  test('page heading "Geofences" renders', async ({ page }) => {
    await signup(page)
    await gotoGeofences(page)
    await expect(page.getByRole('heading', { name: /^geofences$/i, level: 1 })).toBeVisible()
  })

  test('"N zones" subheader text reflects geofence count', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoGeofences(page)
    await expect(page.getByText(/\d+ zones/i)).toBeVisible({ timeout: 10000 })
  })

  test('"N active zones · live" map overlay renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoGeofences(page)
    // Map placeholder caption renders.
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).toMatch(/active zones/i)
  })

  test('first geofence article renders with type chip', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoGeofences(page)
    const article = page.getByRole('article').first()
    await expect(article).toBeVisible({ timeout: 10000 })
    const txt = (await article.textContent()) ?? ''
    expect(txt).toMatch(/depot|customer|restricted|service area|service_area/i)
  })

  test('first geofence card shows "Vehicles" stat', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoGeofences(page)
    const article = page.getByRole('article').first()
    await expect(article).toBeVisible({ timeout: 10000 })
    const txt = (await article.textContent()) ?? ''
    expect(txt).toMatch(/vehicles/i)
  })

  test('"+ New geofence" creates a zone that survives page reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoGeofences(page)
    const name = `E2E Zone ${Date.now() % 100000}`
    await page.getByRole('button', { name: /\+ new geofence/i }).click()
    await page.getByLabel(/^name$/i).fill(name)
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 })
    await page.reload()
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 })
  })
})
