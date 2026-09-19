import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/reservations/:id', () => {
  test('renders the detail fields and legal lifecycle buttons for a held reservation', async ({
    page,
  }) => {
    await signup(page)
    const target = await page.evaluate(async () => {
      const resp = await fetch('/api/reservations?status=held', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ id: string; confirmation_code: string }> }
      return body.data[0]
    })
    test.skip(!target, 'no held reservation in this environment')
    await page.goto(APP_BASE + '/reservations/' + target!.id)
    await expect(page.locator('[data-mol-id="reservation-detail-heading"]')).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-mol-id="reservation-detail-field-confirmation-code"]'),
    ).toContainText(target!.confirmation_code)
    await expect(page.locator('[data-mol-id="reservation-transition-confirmed"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="reservation-transition-cancelled"]')).toBeVisible()
  })

  test('checking a held reservation in moves it to checked_in via the API', async ({ page }) => {
    await signup(page)
    const target = await page.evaluate(async () => {
      const resp = await fetch('/api/reservations?status=held', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ id: string }> }
      return body.data[0]
    })
    test.skip(!target, 'no held reservation in this environment')
    await page.goto(APP_BASE + '/reservations/' + target!.id)
    await page.locator('[data-mol-id="reservation-transition-confirmed"]').click()
    await expect(page.locator('[data-mol-id="reservation-transition-checked_in"]')).toBeVisible({
      timeout: 15_000,
    })
    await page.locator('[data-mol-id="reservation-transition-checked_in"]').click()
    await expect(page.locator('[data-mol-id="reservation-detail-terminal"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('a final-state reservation shows the terminal notice', async ({ page }) => {
    await signup(page)
    const target = await page.evaluate(async () => {
      const resp = await fetch('/api/reservations?status=cancelled', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ id: string }> }
      return body.data[0]
    })
    test.skip(!target, 'no cancelled reservation in this environment')
    await page.goto(APP_BASE + '/reservations/' + target!.id)
    await expect(page.locator('[data-mol-id="reservation-detail-terminal"]')).toBeVisible({
      timeout: 15_000,
    })
  })
})
