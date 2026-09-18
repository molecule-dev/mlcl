/**
 * Immunizations list contract — API exposes `series_total` (not
 * `total_doses`) and no `status` column; the frontend derives both.
 * This spec asserts the wire shape so the renamed field doesn't silently
 * regress, and confirms the rendered status badges match the derivation.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listImmunizations, signup, uniqueEmail } from './_helpers.js'

test.describe('immunizations', () => {
  test('API returns series_total + dose_number for the page to derive status from', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('immun-shape'))
    const items = await listImmunizations(page, accessToken)
    expect(items.length).toBeGreaterThan(0)
    for (const i of items) {
      expect(typeof i.dose_number).toBe('number')
      expect(typeof i.series_total).toBe('number')
    }
  })

  test('page renders no unresolved {{placeholder}} tokens in the dose label', async ({ page }) => {
    await signup(page, uniqueEmail('immun-render'))
    await page.goto(APP_BASE + '/immunizations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-immunizations"]').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body, 'i18n placeholders must resolve to actual numbers').not.toMatch(
      /\{\{(num|total|date|mfr)\}\}/,
    )
  })

  test('completed series renders an "Up to date" badge', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('immun-status'))
    const items = await listImmunizations(page, accessToken)
    const completed = items.find((i) => i.dose_number >= i.series_total)
    if (!completed) {
      test.skip(true, 'No completed immunization series in the seed.')
      return
    }
    await page.goto(APP_BASE + '/immunizations')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toContain('up to date')
  })
})
