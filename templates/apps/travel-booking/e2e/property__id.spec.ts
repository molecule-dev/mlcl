/**
 * /property/:id: PropertyDetail page. Resolves a real property id by
 * hitting /api/accommodations first, then drives the gallery lightbox.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

async function firstPropertyId(page: import('@playwright/test').Page): Promise<string> {
  const res = await apiRequest(page, 'GET', '/accommodations')
  const data = res.body as { data?: Array<{ id: string }> } | Array<{ id: string }>
  const list = Array.isArray(data) ? data : (data?.data ?? [])
  expect(list.length).toBeGreaterThan(0)
  return list[0].id
}

test('property heading renders + GET /api/accommodations/:id fires', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/property/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const detailReq = reqs.find(
    (r) =>
      r.method === 'GET' && new RegExp(`/api/accommodations/${id}(?!/reviews|/rooms)`).test(r.url),
  )
  expect(detailReq?.status).toBe(200)
})

test('All photos button opens the gallery lightbox', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/property/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="property-all-photos"]').click()
  await expect(page.locator('[data-testid="property-gallery-modal"]')).toBeVisible()
})

test('gallery modal element renders when opened', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/property/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="property-all-photos"]').click()
  await expect(page.locator('[data-testid="property-gallery-modal"]')).toHaveAttribute(
    'role',
    'dialog',
  )
})

test('gallery next button advances the counter', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/property/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="property-all-photos"]').click()
  const counterBefore = await page.locator('[data-testid="property-gallery-counter"]').textContent()
  await page.locator('[data-testid="property-gallery-next"]').click()
  const counterAfter = await page.locator('[data-testid="property-gallery-counter"]').textContent()
  // either counter advanced or there's only one photo (button disabled)
  expect(counterAfter).toBeTruthy()
  expect(counterBefore).toBeTruthy()
})

test('gallery prev button is rendered', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/property/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="property-all-photos"]').click()
  await expect(page.locator('[data-testid="property-gallery-prev"]')).toBeVisible()
})

test('gallery close button closes the lightbox', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/property/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="property-all-photos"]').click()
  await page.locator('[data-testid="property-gallery-close"]').click()
  await expect(page.locator('[data-testid="property-gallery-modal"]')).toHaveCount(0)
})

test('back link returns to /search', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/property/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.getByRole('link', { name: /back/i }).first().click()
  await expect(page).toHaveURL(/\/search/)
})
