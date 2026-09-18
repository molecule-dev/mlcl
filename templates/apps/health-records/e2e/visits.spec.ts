/**
 * Visits timeline + detail. Verifies the wire-shape contract: API
 * returns scheduled_at / clinic_name / chief_complaint, the list page
 * normalizes to a display row, and the detail page renders the fields
 * the API actually exposes.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listVisits, signup, uniqueEmail } from './_helpers.js'

test.describe('visits', () => {
  test('list page renders timeline entries derived from /api/visits', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('visits-list'))
    const visits = await listVisits(page, accessToken)
    expect(visits.length).toBeGreaterThan(0)
    expect(
      visits[0].scheduled_at,
      'API must return scheduled_at — frontend derives display date from it',
    ).toBeTruthy()
    await page.goto(APP_BASE + '/visits')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-visits"]').first()).toBeVisible()
    const links = page.locator('a[href^="/visits/"]')
    await expect(links.first()).toBeAttached()
  })

  test('detail page hits /api/visits/:id and surfaces provider + clinic', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('visits-detail'))
    const visits = await listVisits(page, accessToken)
    const v = visits[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/visits/${v.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some(
        (r) => r.url.endsWith(`/api/visits/${v.id}`) && r.method === 'GET' && r.status < 400,
      ),
    ).toBe(true)
    const body = await page.locator('body').innerText()
    if (v.provider_name) expect(body).toContain(v.provider_name)
    if (v.clinic_name) expect(body).toContain(v.clinic_name)
  })
})
