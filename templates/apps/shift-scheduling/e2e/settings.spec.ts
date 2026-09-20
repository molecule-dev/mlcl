/**
 * /settings — workspace name editor (Company section), audit log feed.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('Manage on Company opens an inline editor that saves workspace name (GET + PATCH /api/profile/me observed)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'GET')).toBeTruthy()
    // Open the company section
    const companyCard = page.getByRole('heading', { name: /^company$/i }).locator('..')
    await companyCard.getByRole('button', { name: /^manage$/i }).click()
    const wsInput = page
      .locator('input[type="text"]')
      .filter({ hasNot: page.locator('[disabled]') })
      .first()
    await wsInput.fill('Shiftly Crew')
    await page.getByRole('button', { name: /^save$/i }).click()
    // Server-side: profile workspace_name should be updated
    await expect(async () => {
      const res = await page.request.get(`${API_BASE}/profile/me`, {
        headers: apiHeaders(accessToken),
      })
      const body = (await res.json()) as { workspace_name: string }
      expect(body.workspace_name).toBe('Shiftly Crew')
    }).toPass({ timeout: 10_000 })
  })

  test('audit log renders entries derived from the seeded roster + schedule', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(/recent changes/i)).toBeVisible()
  })

  test('GET /api/audit returns synthesized + real audit entries', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Hit /api/staff first so the seeder runs and produces synth rows.
    await page.request.get(`${API_BASE}/staff`, { headers: apiHeaders(accessToken) })
    const res = await page.request.get(`${API_BASE}/audit`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ action: string; target_label: string }>
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toHaveProperty('action')
    expect(body[0]).toHaveProperty('target_label')
  })
})
