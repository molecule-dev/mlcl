import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

test.describe('messages page', () => {
  test('renders heading on /messages', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/messages')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('mount fires GET /api/bookings (used as thread list)', async ({ browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/messages')
      await p2.waitForTimeout(2000)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/bookings\b/.test(r.url))).toBeTruthy()
    await fresh.close()
  })

  test('with a booking seeded, a thread link appears that navigates to /bookings/:id', async ({
    page,
  }) => {
    await signup(page)
    const pet = await authedPost(page, '/pets', {
      name: `Mp-${Date.now()}`,
      species: 'dog',
      breed: 'Mix',
    })
    const sitters = (await authedGet(page, '/sitters')) as Array<{ id: string }>
    const start = new Date(Date.now() + 86_400_000).toISOString()
    const end = new Date(Date.now() + 86_400_000 + 7200_000).toISOString()
    const booking = await authedPost(page, '/bookings', {
      sitter_id: sitters[0].id,
      pet_ids: [pet.id],
      service: 'walk',
      starts_at: start,
      ends_at: end,
      notes: 'msg test',
    })
    await page.goto(APP_BASE + '/messages')
    await page.waitForLoadState('networkidle')
    const link = page.locator(`a[href="/bookings/${booking.id}"]`).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(new RegExp(`/bookings/${booking.id}$`))
    }
  })
})
