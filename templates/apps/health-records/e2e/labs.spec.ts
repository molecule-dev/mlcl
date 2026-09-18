/**
 * Lab results — outcome assertions for the diagnostics page.
 *
 *  - GET /api/labs returns seeded rows for a fresh user.
 *  - The lab list page renders without unresolved {{placeholder}} tokens
 *    and shows at least one row from the API.
 *  - The "flagged" badge count matches the API row count for non-normal flags.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

interface LabApi {
  id: string
  test_name: string
  category?: string
  results?: string | Array<{ value: string }>
  flag?: string
}

async function listLabs(
  page: import('@playwright/test').Page,
  token: string | null,
): Promise<LabApi[]> {
  const r = await page.request.get(`${API_BASE}/labs?patient_id=me`, {
    headers: authHeaders(token),
  })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as LabApi[]
}

test.describe('labs', () => {
  test('GET /api/labs returns seeded rows for a fresh user', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('labs-seed'))
    const labs = await listLabs(page, accessToken)
    expect(labs.length).toBeGreaterThan(0)
    expect(typeof labs[0].test_name).toBe('string')
  })

  test('lab results page renders rows without unresolved placeholders', async ({ page }) => {
    await signup(page, uniqueEmail('labs-page'))
    await page.goto(APP_BASE + '/labs')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-lab-results"]').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body).not.toContain('{{')
    expect(body).not.toContain('}}')
  })

  test('flagged badge count matches the number of abnormal labs from the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('labs-flagged'))
    const labs = await listLabs(page, accessToken)
    const abnormal = labs.filter((l) => l.flag && l.flag !== 'normal').length
    await page.goto(APP_BASE + '/labs')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // The badge text is "<n> flagged".
    expect(body).toMatch(new RegExp(`${abnormal}\\s+flagged`, 'i'))
  })

  test('list endpoint hydrates each lab with measurement values (not just metadata)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('labs-values'))
    const labs = await listLabs(page, accessToken)
    expect(labs.length).toBeGreaterThan(0)
    const labWithValues = labs.find((l) => Array.isArray(l.results) && l.results.length > 0)
    expect(
      labWithValues,
      'no lab returned with measured values — list endpoint is not hydrating from lab_result_values',
    ).toBeTruthy()
  })

  test('lab results page renders measurable numeric values (no "—" leak for hydrated rows)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('labs-numeric'))
    await page.goto(APP_BASE + '/labs')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // A non-empty seed should contain at least one numeric LDL/A1C/etc.
    // value formatted with a unit. The em-dash placeholder should not be
    // the only value the page can render.
    expect(body).toMatch(/\d+(?:\.\d+)?\s*(?:mg\/dL|%|ng\/mL|µIU\/mL|g\/dL|mg\/L)/i)
  })
})
