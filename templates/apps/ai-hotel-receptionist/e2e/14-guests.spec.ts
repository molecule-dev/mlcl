import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/guests', () => {
  test('lists guest profiles from the API with language and stay count', async ({ page }) => {
    await signup(page)
    const guests = await page.evaluate(async () => {
      const resp = await fetch('/api/guests', { credentials: 'include' })
      const body = (await resp.json()) as {
        data: Array<{ id: string; preferred_language: string }>
      }
      return body.data
    })
    expect(guests.length, 'guests must be seeded').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/guests')
    await expect(page.getByRole('heading', { name: 'Guests', exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('[data-mol-id="guest-row-' + guests[0]!.id + '"]')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('[data-mol-id="guest-row-' + guests[0]!.id + '"]')).toContainText(
      guests[0]!.preferred_language,
    )
  })

  test('search narrows the list to matching guests', async ({ page }) => {
    await signup(page)
    const all = await page.evaluate(async () => {
      const resp = await fetch('/api/guests', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ id: string; name: string }> }
      return body.data
    })
    const target = all[0]!
    await page.goto(APP_BASE + '/guests')
    await page.locator('[data-mol-id="guests-search"]').fill(target.name.slice(0, 4))
    await expect(page.locator('[data-mol-id="guest-row-' + target.id + '"]')).toBeVisible({
      timeout: 15_000,
    })
    const absent = all.find((g) => g.id !== target.id)
    if (absent) {
      await expect(page.locator('[data-mol-id="guest-row-' + absent.id + '"]')).toHaveCount(0)
    }
  })
})
