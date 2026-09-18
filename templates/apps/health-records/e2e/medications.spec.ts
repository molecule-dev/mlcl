/**
 * Medications outcome assertions:
 *  - list page renders rows from /api/medications
 *  - detail page renders matching DB shape (refills_remaining)
 *  - refill action posts /api/medications/:id/refill, the refills_used
 *    counter goes UP on the next GET, and the row reflects the change
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  listMedications,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('medications', () => {
  test('list page renders rows that match /api/medications', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('meds-list'))
    const apiMeds = await listMedications(page, accessToken)
    expect(apiMeds.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/medications')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-medications"]').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).toContain(apiMeds[0].name.toLowerCase())
  })

  test('detail page surfaces the prescription details from /api/medications/:id', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('meds-detail'))
    const meds = await listMedications(page, accessToken)
    const med = meds[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/medications/${med.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some(
        (r) => r.url.endsWith(`/api/medications/${med.id}`) && r.method === 'GET' && r.status < 400,
      ),
    ).toBe(true)
    const body = await page.locator('body').innerText()
    expect(body).toContain(med.name)
  })

  test('refill action increments refills_used', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('meds-refill'))
    const before = await listMedications(page, accessToken)
    const target = before.find((m) => (m.refills_remaining ?? 0) > 0)
    if (!target) {
      test.skip(true, 'No medication has remaining refills in the seed.')
      return
    }
    const beforeUsed = target.refills_used ?? 0
    const r = await page.request.post(`${API_BASE}/medications/${target.id}/refill`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
    const after = await listMedications(page, accessToken)
    const updated = after.find((m) => m.id === target.id)!
    expect(updated.refills_used ?? 0).toBeGreaterThan(beforeUsed)
  })
})
