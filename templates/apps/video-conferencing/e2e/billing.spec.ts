import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { api, signup } from './_helpers.js'

test.describe('billing', () => {
  test('GET /billing/tiers returns 3 tiers', async ({ page }) => {
    await signup(page)
    const tiers = await api<
      Array<{ key: string; name: string; prices: unknown[]; limits: Record<string, unknown> }>
    >(page, 'GET', '/billing/tiers')
    expect(tiers.length).toBeGreaterThanOrEqual(3)
    const keys = tiers.map((t) => t.key).sort()
    expect(keys).toEqual(['free', 'pro', 'team'])
  })

  test('billing status defaults to free for new user', async ({ page }) => {
    await signup(page)
    const status = await api<{ planKey: string; isFree: boolean }>(page, 'GET', '/billing/status')
    expect(status.isFree).toBe(true)
  })

  test('/billing renders the tier list from the real API', async ({ page }) => {
    await signup(page)
    await page.goto('/billing')
    await expect(page.getByTestId('tier-free')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('tier-pro')).toBeVisible()
    await expect(page.getByTestId('tier-team')).toBeVisible()
    await expect(page.getByTestId('current-plan')).toHaveText(/Free/i)
  })
})
