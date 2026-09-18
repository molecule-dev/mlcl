/**
 * /booking/:id: Confirm-and-pay flow. Resolves a real property id by
 * hitting /api/accommodations first.
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

test('Trip details heading renders + property/rooms/profile GETs fire', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/booking/${id}`)
    await expect(page.getByRole('heading', { name: /Trip details/i })).toBeVisible({
      timeout: 15_000,
    })
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  expect(
    reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/accommodations/${id}(\\?|$)`).test(r.url),
    )?.status,
  ).toBe(200)
  expect(
    reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/accommodations/${id}/rooms`).test(r.url),
    )?.status,
  ).toBe(200)
  expect(reqs.find((r) => r.method === 'GET' && /\/api\/profile\/me/.test(r.url))?.status).toBe(200)
})

test('check-in date input accepts a value', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('#booking-check-in').fill('2026-09-01')
  await expect(page.locator('#booking-check-in')).toHaveValue('2026-09-01')
})

test('check-out date input accepts a value', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('#booking-check-out').fill('2026-09-05')
  await expect(page.locator('#booking-check-out')).toHaveValue('2026-09-05')
})

test('guests selector accepts a value change', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="booking-guests"]').selectOption('3')
  expect(await page.locator('[data-testid="booking-guests"]').inputValue()).toBe('3')
})

test('special requests textarea accepts text', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="booking-special-requests"]').fill('Late check-in please')
  await expect(page.locator('[data-testid="booking-special-requests"]')).toHaveValue(
    'Late check-in please',
  )
})

test('agree-to-terms checkbox flips checked state', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="booking-agree-terms"]').check()
  await expect(page.locator('[data-testid="booking-agree-terms"]')).toBeChecked()
})

test('Payment method heading is visible', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /Payment method/i })).toBeVisible()
})

test('payment area shows either the no-methods message or the radio list', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const empty = page.locator('[data-testid="booking-no-payment-method"]')
  const list = page.locator('[data-testid="booking-payment-methods"]')
  const visible = (await empty.count()) + (await list.count())
  expect(visible).toBeGreaterThan(0)
})

test('confirm button is present', async ({ page }) => {
  await signup(page)
  const id = await firstPropertyId(page)
  await page.goto(APP_BASE + `/booking/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /Confirm/i })).toBeVisible()
})
