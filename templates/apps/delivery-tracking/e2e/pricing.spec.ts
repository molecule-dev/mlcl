import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup, unwrap } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders the pricing page heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your Parcel plan/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('mounting actually fires GET /api/billing/tiers (captureNetwork)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.getByRole('heading', { name: /Choose your Parcel plan/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const tiersReq = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiersReq, 'mount must fetch /api/billing/tiers').toBeTruthy()
    expect(tiersReq?.status).toBe(200)
  })

  test('renders the tiers from /api/billing/tiers', async ({ page }) => {
    await signup(page)
    const { body } = await apiRequest<unknown>(page, 'GET', '/api/billing/tiers')
    const tiers = unwrap<unknown>(body)
    expect(
      Array.isArray(tiers) ? tiers.length : Object.keys(tiers as Record<string, unknown>).length,
    ).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/Free/i).first()).toBeVisible()
    await expect(page.getByText(/Pro/i).first()).toBeVisible()
  })

  test('Pricing page shows tier features (carriers / shipments / notifications)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/carriers/i).first()).toBeVisible()
    await expect(page.getByText(/shipments/i).first()).toBeVisible()
    await expect(page.getByText(/notifications/i).first()).toBeVisible()
  })
})
