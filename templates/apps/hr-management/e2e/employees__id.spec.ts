/**
 * /employees/:id — single-employee profile. Loads the employee + their
 * tabs (PTO / documents / audit), supports inline edit + save, and
 * round-trips changes via PATCH /api/employees/:id.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, pickEmployee, signup } from './_helpers.js'

test.describe('employees/:id page', () => {
  test('renders the employee name and tab list', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Whichever employee the roster holds — naming a demo one breaks the
    // spec once the roster is replaced.
    const target = await pickEmployee(page, accessToken)
    await page.goto(APP_BASE + `/employees/${target.id}`)
    await expect(page.getByRole('heading', { name: target.name })).toBeVisible()
    await expect(page.getByRole('button', { name: /personal info/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /time off/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /documents/i })).toBeVisible()
  })

  test('initial mount fires GET /api/employees/:id (network observed)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const id = (await pickEmployee(page, accessToken)).id
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/employees/${id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.find((r) => r.url.includes(`/api/employees/${id}`) && r.method === 'GET'),
    ).toBeTruthy()
  })

  test('Edit → save → reload persists the new phone number (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const target = await pickEmployee(page, accessToken)
    await page.goto(APP_BASE + `/employees/${target.id}`)
    await page.getByRole('button', { name: /^edit$/i }).click()
    const phone = `+1 (415) 555-${(Date.now() % 10000).toString().padStart(4, '0')}`
    await page.locator('input[type="tel"]').first().fill(phone)
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByRole('button', { name: /^edit$/i })).toBeVisible({ timeout: 10_000 })
    const verifyRes = await page.request.get(`${API_BASE}/employees/${target.id}`, {
      headers: apiHeaders(accessToken),
    })
    const verify = (await verifyRes.json()) as { phone: string }
    expect(verify.phone).toBe(phone)
  })
})
