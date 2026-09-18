import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

test.describe('sitter detail page', () => {
  test('renders sitter heading + Book a visit CTA', async ({ page }) => {
    await signup(page)
    const sitters = (await authedGet(page, '/sitters')) as Array<{
      id: string
      display_name: string
    }>
    expect(sitters.length).toBeGreaterThan(0)
    const sitter = sitters[0]
    await page.goto(APP_BASE + `/sitters/${sitter.id}`)
    await expect(
      page.getByRole('heading', { name: new RegExp(sitter.display_name, 'i') }),
    ).toBeVisible()
    await expect(page.locator('[data-mol-id="cta-book-sitter"]')).toBeVisible()
  })

  test('mount fires GET /api/sitters/:id', async ({ page }) => {
    await signup(page)
    const sitters = (await authedGet(page, '/sitters')) as Array<{ id: string }>
    const id = sitters[0].id
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/sitters/${id}`)
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && new RegExp(`/api/sitters/${id}\\b`).test(r.url)),
    ).toBeTruthy()
  })

  test('Book a visit → POST /api/bookings → navigate to /bookings/:id', async ({ page }) => {
    await signup(page)
    // create a pet so the modal can auto-select
    await authedPost(page, '/pets', { name: `Bk-${Date.now()}`, species: 'dog', breed: 'Mix' })
    const sitters = (await authedGet(page, '/sitters')) as Array<{ id: string }>
    await page.goto(APP_BASE + `/sitters/${sitters[0].id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="cta-book-sitter"]').click()
    await page.waitForTimeout(300)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="submit-book-sitter"]').click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/bookings\b/.test(r.url))
    expect(post, 'POST /api/bookings observed').toBeTruthy()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
    await expect(page).toHaveURL(/\/bookings\/[a-f0-9-]+/, { timeout: 10000 })
  })

  test('messages link routes off /sitters/:id', async ({ page }) => {
    await signup(page)
    const sitters = (await authedGet(page, '/sitters')) as Array<{ id: string }>
    await page.goto(APP_BASE + `/sitters/${sitters[0].id}`)
    const link = page.getByRole('link', { name: /message|chat/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).not.toHaveURL(new RegExp(`/sitters/${sitters[0].id}$`))
    }
  })
})
