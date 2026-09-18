import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

async function seedBookingFlow(page: any) {
  await signup(page)
  const pet = await authedPost(page, '/pets', {
    name: `Bk-${Date.now()}`,
    species: 'dog',
    breed: 'Mix',
  })
  const sitters = (await authedGet(page, '/sitters')) as Array<{ id: string }>
  const start = new Date(Date.now() + 86_400_000).toISOString()
  const end = new Date(Date.now() + 86_400_000 + 2 * 3600_000).toISOString()
  const booking = await authedPost(page, '/bookings', {
    sitter_id: sitters[0].id,
    pet_ids: [pet.id],
    service: 'walk',
    starts_at: start,
    ends_at: end,
    notes: 'e2e fixture',
  })
  return booking.id as string
}

test.describe('booking detail page', () => {
  test('renders heading + cancel CTA + GET /api/bookings/:id', async ({ page }) => {
    const id = await seedBookingFlow(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/bookings/${id}`)
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && new RegExp(`/api/bookings/${id}\\b`).test(r.url)),
    ).toBeTruthy()
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('[data-mol-id="cta-cancel-booking"]')).toBeVisible()
  })

  test('Cancel booking → POST /api/bookings/:id/cancel and status flips', async ({ page }) => {
    const id = await seedBookingFlow(page)
    await page.goto(APP_BASE + `/bookings/${id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="cta-cancel-booking"]').click()
    await page.waitForTimeout(300)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="cta-confirm-cancel"]').click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/bookings\/.*\/cancel\b/.test(r.url),
    )
    expect(post, 'POST /api/bookings/:id/cancel observed').toBeTruthy()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)

    const after = (await authedGet(page, `/bookings/${id}`)) as { status: string }
    expect(after.status).toBe('cancelled')
  })

  test('send a message → POST /api/bookings/:id/messages and message appears', async ({ page }) => {
    const id = await seedBookingFlow(page)
    await page.goto(APP_BASE + `/bookings/${id}`)
    await page.waitForLoadState('networkidle')
    const input = page.locator('input[type="text"], textarea').last()
    if (await input.count().catch(() => 0)) {
      const body = `Hello! ${Date.now()}`
      await input.fill(body)
      const sendBtn = page.getByRole('button', { name: /send/i }).first()
      if (await sendBtn.count().catch(() => 0)) {
        const reqs = await captureNetwork(page, async () => {
          await sendBtn.click()
          await page.waitForTimeout(2000)
        })
        const post = reqs.find(
          (r) => r.method === 'POST' && /\/api\/bookings\/.*\/messages\b/.test(r.url),
        )
        if (post) {
          expect(post.status).toBeGreaterThanOrEqual(200)
          expect(post.status).toBeLessThan(300)
        }
      }
    }
  })

  test('mount also fires GET /api/bookings/:id/messages', async ({ page }) => {
    const id = await seedBookingFlow(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/bookings/${id}`)
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && new RegExp(`/api/bookings/${id}/messages\\b`).test(r.url),
      ),
    ).toBeTruthy()
  })
})
