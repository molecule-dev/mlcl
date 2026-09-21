/**
 * /staff — roster table: rows render with role + weekly hours, the add
 * form posts through /api/staff, and search filters.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedStaff,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('staff page', () => {
  test('roster renders and initial mount fetches /api/staff', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await seedStaff(page, accessToken, {
      first_name: 'Rowan',
      last_name: 'Checkly',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/staff')
      await expect(page.getByRole('heading', { name: /staff roster/i })).toBeVisible()
    })
    expect(reqs.find((r) => /\/api\/staff(?:\?|$)/.test(r.url) && r.method === 'GET')).toBeTruthy()
    await expect(page.getByText(person.name).first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /^role$/i }).first()).toBeVisible()
  })

  test('Add staff form posts to /api/staff and the row appears', async ({ page }) => {
    const { accessToken } = await signup(page)
    const lastName = `Hire${Date.now() % 100000}`
    await page.goto(APP_BASE + '/staff')
    await page.getByRole('button', { name: /^add staff$/i }).click()
    // The compose form fields are wrapping-label inputs (no placeholders).
    const compose = page.locator('[data-mol-id="staff-compose"]')
    await compose.getByLabel(/first name/i).fill('Newest')
    await compose.getByLabel(/last name/i).fill(lastName)
    await compose.getByLabel(/email/i).fill(uniqueEmail('staffpage'))
    await page.getByRole('button', { name: /^add staff member$/i }).click()
    await expect(page.getByText(new RegExp(`newest ${lastName}`, 'i')).first()).toBeVisible({
      timeout: 10_000,
    })
    void accessToken
  })

  test('search narrows the roster', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await seedStaff(page, accessToken, {
      first_name: 'Quinn',
      last_name: 'Needleish',
    })
    await page.goto(APP_BASE + '/staff')
    await page.locator('[data-mol-id="staff-search"]').fill(person.name)
    await expect(page.getByText(person.name).first()).toBeVisible()
    await expect(page.locator('[data-mol-id^="staff-row-"]')).toHaveCount(1, { timeout: 10_000 })
  })

  test('GET /api/staff/:id returns the decorated person', async ({ page }) => {
    const { accessToken } = await signup(page)
    const person = await seedStaff(page, accessToken)
    const res = await page.request.get(`${API_BASE}/staff/${person.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { id: string; name: string; max_weekly_hours: number }
    expect(body.id).toBe(person.id)
    expect(body.name).toBeTruthy()
    expect(body.max_weekly_hours).toBeGreaterThan(0)
  })
})
