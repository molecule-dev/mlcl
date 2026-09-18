import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/appointments/new — Booking entry without provider', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/appointments/new')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders the booking form skeleton without a provider preselected', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/appointments/new')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })
    // Unprovided booking shows a "select a provider first" empty state.
    await expect(page.locator('body')).toContainText(
      /(select|choose|browse).*(provider|directory)/i,
    )
  })

  test('Empty-state link routes to /providers (directory)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/appointments/new')
    const browse = page.getByRole('link', { name: /find.*provider/i }).first()
    await expect(browse).toBeVisible({ timeout: 10000 })
    await browse.click()
    await expect(page).toHaveURL(/\/providers$/, { timeout: 10000 })
  })

  test('When provider preselected via ?provider_id, fetches provider + availability', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    void accessToken
    const provs = await page.request.get(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/providers',
    )
    const list = (await provs.json()) as Array<{ id: string }>
    expect(list.length, 'provider directory must seed at least one provider').toBeGreaterThan(0)
    const providerId = list[0].id
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/appointments/new?provider_id=' + providerId)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })
    })
    const provHit = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/providers/${providerId}(\\?|$)`).test(r.url),
    )
    expect(provHit, 'must call /api/providers/:id when provider preselected').toBeTruthy()
    const availHit = reqs.find(
      (r) => r.method === 'GET' && /\/api\/providers\/.+\/availability/.test(r.url),
    )
    expect(
      availHit,
      'must call /api/providers/:id/availability when provider preselected',
    ).toBeTruthy()
  })
})
