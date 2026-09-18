/**
 * /employees — list, search, status filter, navigate to profile, and
 * create via /employees/new (POST → list update → reload-survives).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  getEmployees,
  pickEmployee,
  seedEmployee,
  signup,
} from './_helpers.js'

test.describe('employees page', () => {
  test('initial load issues GET /api/employees and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/employees')
      await expect(page.getByRole('heading', { name: /employees/i, level: 1 })).toBeVisible()
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/employees(\?|$)/.test(r.url))
    expect(get?.status, 'GET /api/employees').toBeLessThan(400)
  })

  test('the roster renders one link per employee', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Read the roster from the same endpoint the page reads — naming a demo
    // employee breaks this spec the moment the roster is replaced.
    const roster = await getEmployees(page, accessToken)
    expect(roster.length, 'the app must hold at least one employee').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/employees')
    for (const employee of roster.slice(0, 2)) {
      await expect(page.getByRole('link', { name: employee.name })).toBeVisible()
    }
  })

  test('on-leave filter narrows to status=on-leave', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Both halves are created through the same POST /api/employees the
    // Add-employee form uses, so the filter is proven against rows this spec
    // owns rather than against whichever statuses the demo roster happens to
    // carry.
    const stamp = Date.now() % 100000
    const onLeave = await seedEmployee(page, accessToken, {
      first_name: 'Onleave',
      last_name: `Probe${stamp}`,
      status: 'on-leave',
    })
    const active = await seedEmployee(page, accessToken, {
      first_name: 'Onduty',
      last_name: `Probe${stamp}`,
      status: 'active',
    })
    await page.goto(APP_BASE + '/employees')
    await expect(page.getByRole('link', { name: onLeave.name })).toBeVisible()
    await expect(page.getByRole('link', { name: active.name })).toBeVisible()
    await page.getByRole('button', { name: /^on leave$/i }).click()
    await expect(page.getByRole('link', { name: onLeave.name })).toBeVisible()
    await expect(page.getByRole('link', { name: active.name })).not.toBeVisible()
  })

  test('search box narrows the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const stamp = Date.now() % 100000
    const target = await seedEmployee(page, accessToken, {
      first_name: 'Findable',
      last_name: `Probe${stamp}`,
    })
    const other = await seedEmployee(page, accessToken, {
      first_name: 'Hidden',
      last_name: `Probe${stamp}`,
    })
    await page.goto(APP_BASE + '/employees')
    await page.getByPlaceholder(/search/i).fill('Findable')
    await expect(page.getByRole('link', { name: target.name })).toBeVisible()
    await expect(page.getByRole('link', { name: other.name })).not.toBeVisible()
  })

  test('clicking an employee row navigates to /employees/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const employee = await pickEmployee(page, accessToken)
    await page.goto(APP_BASE + '/employees')
    await page.getByRole('link', { name: employee.name }).first().click()
    await page.waitForURL(/\/employees\/[0-9a-f-]{36}/, { timeout: 10_000 })
  })

  test('create employee via /employees/new persists and shows on /employees', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/employees/new')
    const last = `Hire${Date.now() % 100000}`
    await page.locator('input[placeholder="First name"]').fill('Newest')
    await page.locator('input[placeholder="Last name"]').fill(last)
    await page.locator('input#work-email').fill(`new+${Date.now()}@arbor.example`)
    await page.getByRole('button', { name: /^save employee$/i }).click()
    await page.waitForURL(/\/employees(\/[0-9a-f-]{36})?$/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/employees')
    await expect(page.getByRole('link', { name: new RegExp(`newest ${last}`, 'i') })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('POST employee returns decorated shape (read-after-write parity)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedEmployee(page, accessToken, {
      first_name: 'Seed',
      last_name: 'Hire',
      department_name: 'Engineering',
    })
    const res = await page.request.get(`${API_BASE}/employees/${seeded.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { name: string; department: string; status: string }
    expect(body.name).toBe('Seed Hire')
    expect(body.department).toBe('Engineering')
    expect(body.status).toBe('active')
  })
})
