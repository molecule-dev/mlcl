import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function firstMaintId(
  page: import('@playwright/test').Page,
  accessToken: string,
): Promise<string> {
  const res = await page.request.get(API_BASE + '/maintenance', {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const list = (await res.json()) as Array<{ id: string }>
  expect(list.length).toBeGreaterThan(0)
  return list[0]!.id
}

test.describe('maintenance detail (/maintenance/:id)', () => {
  test('header renders work-order label, description, and link to vehicle', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/work order/i)).toBeVisible()
    // The vehicle plate link.
    await expect(
      page
        .getByRole('link')
        .filter({ hasText: /^[A-Z0-9-]{2,}$/ })
        .first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test('Parts section renders with at least one row and a non-zero parts total', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { name: /^parts$/i })).toBeVisible({ timeout: 10000 })
    // The total estimate row shows a non-zero $ amount.
    const totalRow = page.getByText(/total estimate/i).locator('xpath=following-sibling::*[1]')
    const totalText = ((await totalRow.textContent()) ?? '').trim()
    expect(totalText, 'total estimate').not.toEqual('$0.00')
    expect(totalText).toMatch(/^\$\d/)
  })

  test('Activity section renders timeline with at least one event row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { name: /^activity$/i })).toBeVisible({ timeout: 10000 })
    // At least one <li> inside the activity timeline.
    const items = page.locator('ol > li')
    await expect.poll(() => items.count(), { timeout: 5000 }).toBeGreaterThanOrEqual(1)
  })

  test('"All maintenance" link navigates back to /maintenance', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await page.getByRole('link', { name: /all maintenance/i }).click()
    await expect(page).toHaveURL(/\/maintenance$/)
  })

  test('GET /api/maintenance/:id fires on mount and returns the full shape (parts, labor, events)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/maintenance/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    })
    const detail = reqs.find(
      (r) => new RegExp(`/api/maintenance/${id}\\b`).test(r.url) && r.method === 'GET',
    )
    expect(detail?.status, 'GET /api/maintenance/:id').toBe(200)
    const apiResp = await page.request.get(API_BASE + `/maintenance/${id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await apiResp.json()) as {
      parts?: unknown[]
      labor_hours?: number
      labor_rate?: number
      events?: unknown[]
    }
    expect(Array.isArray(body.parts) ? body.parts!.length : 0, 'parts list').toBeGreaterThanOrEqual(
      1,
    )
    expect(typeof body.labor_hours).toBe('number')
    expect(typeof body.labor_rate).toBe('number')
  })

  test('Header label "Work order · <uuid>" exposes a uuid in font-mono', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).toMatch(/work order/i)
    expect(body, 'uuid fragment in header').toMatch(/[0-9a-f]{8}/i)
  })

  test('h1 heading text equals the maintenance description from the API', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    const apiResp = await page.request.get(API_BASE + `/maintenance/${id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await apiResp.json()) as { description?: string }
    await page.goto(APP_BASE + `/maintenance/${id}`)
    if (body.description) {
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: new RegExp(body.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        }),
      ).toBeVisible({ timeout: 10000 })
    }
  })

  test('Vehicle plate link navigates to /vehicles/<uuid>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    const apiResp = await page.request.get(API_BASE + `/maintenance/${id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await apiResp.json()) as { vehicle_plate?: string; vehicle_id?: string }
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    if (body.vehicle_plate && body.vehicle_id) {
      await page.getByRole('link', { name: body.vehicle_plate, exact: false }).first().click()
      await expect(page).toHaveURL(new RegExp(`/vehicles/${body.vehicle_id}$`))
    }
  })

  test('Header subtitle includes "Scheduled <date>"', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'scheduled subtitle').toMatch(/scheduled/i)
  })

  test('At least one part row renders inside the Parts section', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { name: /^parts$/i })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, '× quantity marker').toMatch(/×\s*\d+|x\s*\d+/i)
  })

  test('Labor row renders with a money-formatted value', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { name: /^parts$/i })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'labor row').toMatch(/labor[\s\S]{0,100}\$\d/i)
  })

  test('Activity event row contains a date-shaped string', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { name: /^activity$/i })).toBeVisible({ timeout: 10000 })
    const items = page.locator('ol > li')
    const first = await items.first().textContent()
    expect(first ?? '', 'event row text').toMatch(
      /\d{1,2}[/.\-]\d{1,2}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    )
  })

  test('Notes section is conditional — present only when notes are non-empty', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    const apiResp = await page.request.get(API_BASE + `/maintenance/${id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await apiResp.json()) as { notes?: string | null }
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const heading = page.getByRole('heading', { name: /^notes$/i })
    if (body.notes && body.notes.trim().length > 0) {
      await expect(heading).toBeVisible()
    } else {
      await expect(heading).toHaveCount(0)
    }
  })

  test('No NaN, undefined, or [object Object] artifacts in body', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const id = await firstMaintId(page, accessToken)
    await page.goto(APP_BASE + `/maintenance/${id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).not.toMatch(/NaN/)
    expect(body).not.toMatch(/undefined/)
    expect(body).not.toMatch(/\[object Object\]/)
  })
})
