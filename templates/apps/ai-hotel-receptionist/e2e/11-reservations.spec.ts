import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/reservations', () => {
  test('lists rows read from the API and exposes the status filters', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reservations')
    await expect(page.getByRole('heading', { name: 'Reservations', exact: true })).toBeVisible({
      timeout: 15_000,
    })
    const rows = await page.evaluate(async () => {
      const resp = await fetch('/api/reservations', { credentials: 'include' })
      const body = (await resp.json()) as {
        data: Array<{ id: string; guest_name: string; confirmation_code: string }>
      }
      return body.data
    })
    expect(rows.length, 'GET /api/reservations must return seeded rows').toBeGreaterThan(0)
    // Each API row renders as a link into its detail page (UI-anchored).
    await expect(
      page.locator('[data-mol-id="reservation-row-' + rows[0]!.confirmation_code + '"]'),
    ).toBeVisible({
      timeout: 15_000,
    })
    for (const filter of ['held', 'confirmed', 'checked_in']) {
      await expect(page.locator('[data-mol-id="reservations-filter-' + filter + '"]')).toBeVisible()
    }
  })

  test('a status filter narrows the table to matching rows', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reservations')
    await page.locator('[data-mol-id="reservations-filter-cancelled"]').click()
    const cancelled = await page.evaluate(async () => {
      const resp = await fetch('/api/reservations?status=cancelled', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ confirmation_code: string }> }
      return body.data
    })
    const visible = page.locator('tbody [data-mol-id^="reservation-row-"]')
    await expect(visible).toHaveCount(cancelled.length, { timeout: 15_000 })
  })

  test('"New reservation" link navigates to the create flow', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reservations')
    await page.locator('[data-mol-id="reservations-new-link"]').click()
    await expect(page).toHaveURL(/\/reservations\/new/)
    await expect(page.getByRole('heading', { name: /New reservation/i })).toBeVisible()
  })
})
