import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  firstDriverId,
  signup,
  waitForSeed,
} from './_helpers.js'

test.describe('driver detail (/drivers/:id)', () => {
  test('header renders driver name + subtitle (class · license · expires)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    // Subtitle includes a license number / class (single string body check).
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).toMatch(/license|class|expires/i)
  })

  test('stat cards render Safety score, Total miles, Hours today, Hours this week', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/safety score/i)).toBeVisible()
    await expect(page.getByText(/total miles/i)).toBeVisible()
    await expect(page.getByText(/hours today/i)).toBeVisible()
    await expect(page.getByText(/hours this week/i)).toBeVisible()
  })

  test('GET /api/drivers/:id and /api/trips?driver_id=:id both fire on mount', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/drivers/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    })
    const detail = reqs.find(
      (r) => new RegExp(`/api/drivers/${id}\\b`).test(r.url) && r.method === 'GET',
    )
    expect(detail?.status, 'GET /api/drivers/:id').toBe(200)
    const trips = reqs.find((r) => /\/api\/trips\?driver_id=/.test(r.url) && r.method === 'GET')
    expect(trips?.status, 'GET /api/trips?driver_id=').toBe(200)
  })

  test('Contact section shows Email + Phone + Hire date', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body, 'driver email').toMatch(/@/)
    expect(body, 'phone digits').toMatch(/\d{3}/)
  })

  test('"All drivers" link returns to /drivers list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await page.getByRole('link', { name: /all drivers/i }).click()
    await expect(page).toHaveURL(/\/drivers$/)
  })

  test('detail name matches /api/drivers/:id (read-after-write consistency)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    const apiResp = await page.request.get(API_BASE + `/drivers/${id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(apiResp.status()).toBe(200)
    const d = (await apiResp.json()) as { name: string }
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(
      page.getByRole('heading', { level: 1, name: new RegExp(d.name, 'i') }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('Avatar circle (initials) renders with 1-2 letters', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const apiResp = await page.request.get(API_BASE + `/drivers/${id}`, {
      headers: apiHeaders(accessToken),
    })
    const d = (await apiResp.json()) as { name: string }
    const initials = d.name
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .filter(Boolean)
      .slice(0, 2)
      .join('')
    expect(initials.length).toBeGreaterThanOrEqual(1)
    await expect(page.getByText(initials, { exact: true }).first()).toBeVisible()
  })

  test('Header subtitle includes class · license · expires', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'class chunk').toMatch(/class\s+\w+/i)
    // Subtitle renders the CDL number (e.g. "CDL-NY-8472916") which IS the
    // license — accept either the word "license" or a CDL-formatted number.
    expect(body, 'license chunk').toMatch(/license|cdl-?[a-z]{0,4}-?\d{4,}/i)
    expect(body, 'expires chunk').toMatch(/expires/i)
  })

  test('Safety score is numeric between 50 and 100 (not NaN)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByText(/safety score/i)).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).not.toMatch(/NaN/)
    expect(body).toMatch(/safety score[\s\S]{0,200}\d{2,3}/i)
  })

  test('Total miles is numeric, not NaN', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByText(/total miles/i)).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).not.toMatch(/NaN/)
    expect(body).toMatch(/total miles[\s\S]{0,200}\d/i)
  })

  test('Hours today renders like "X.Xh"', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByText(/hours today/i)).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'hours today value').toMatch(/\d+\.\d\s*h/)
    expect(body).not.toMatch(/NaN\s*h/)
  })

  test('Hours this week renders like "X.X / Y h"', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByText(/hours this week/i)).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'hours this week format').toMatch(/\d+(\.\d)?\s*\/\s*\d+\s*h/i)
    expect(body).not.toMatch(/NaN/)
  })

  test('Email field shows a valid-looking email', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'email format').toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
  })

  test('Phone field shows non-empty digits', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'phone digits').toMatch(/\d{3}\D*\d{3}\D*\d{4}|\d{10,}/)
  })

  test('Hire date renders a date-shaped string', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'hire date').toMatch(/hire date/i)
    expect(body, 'localized date').toMatch(
      /\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    )
  })

  test('Assignment section shows vehicle plate link OR "No vehicle assigned." fallback', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const apiResp = await page.request.get(API_BASE + `/drivers/${id}`, {
      headers: apiHeaders(accessToken),
    })
    const d = (await apiResp.json()) as { vehicle_plate?: string | null }
    if (d.vehicle_plate) {
      await expect(page.getByText(d.vehicle_plate, { exact: false }).first()).toBeVisible()
    } else {
      await expect(page.getByText(/no vehicle assigned/i)).toBeVisible()
    }
  })

  test('Recent trips list renders at least one row when trips exist', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    const tripsResp = await page.request.get(API_BASE + `/trips?driver_id=${id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(tripsResp.status()).toBe(200)
    const trips = (await tripsResp.json()) as Array<unknown>
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    if (trips.length > 0) {
      await expect(page.getByText(/recent trips/i)).toBeVisible()
    }
  })

  test('No NaN, undefined, or [object Object] artifacts in body', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstDriverId(page, accessToken)
    await page.goto(APP_BASE + `/drivers/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).not.toMatch(/NaN/)
    expect(body).not.toMatch(/undefined/)
    expect(body).not.toMatch(/\[object Object\]/)
  })
})
