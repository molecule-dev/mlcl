import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, api, seedBoard, captureNetwork, APP_BASE } from './_helpers'

test.describe('billing — current plan, usage, available tiers', () => {
  test('renders current plan, usage cards, and available tiers from the API', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await expect(page.locator('[data-mol-id="billing-current"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="billing-plan-name"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="billing-usage-boards"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="billing-usage-collaborators"]')).toBeVisible()
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && /\/api\/billing\/(status|tiers)/.test(r.url) && r.status < 400,
      ),
      `expected GET /api/billing/{status,tiers} during /billing load — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    const status = await api<{ planKey: string; isFree: boolean; limits: Record<string, number> }>(
      page,
      'GET',
      '/billing/status',
    )
    expect(typeof status.planKey).toBe('string')
    expect(typeof status.isFree).toBe('boolean')
  })

  test('boards count in usage card reflects API state', async ({ page }) => {
    await signup(page)
    await seedBoard(page, { title: 'B1' })
    await seedBoard(page, { title: 'B2' })
    await page.goto(APP_BASE + '/billing')
    // Boards usage value should be '2'.
    await expect(page.locator('[data-mol-id="billing-usage-boards"]')).toContainText('2')
  })

  test('"Compare plans" link navigates to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.locator('[data-mol-id="billing-compare"]').click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('GET /api/billing/tiers returns a non-empty array of pricing tiers', async ({ page }) => {
    await signup(page)
    // Helper auto-unwraps {data:...} envelopes; result is the inner array.
    const tiers = await api<Array<{ key: string; name: string }>>(page, 'GET', '/billing/tiers')
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers.length).toBeGreaterThan(0)
    expect(tiers[0].key).toBeTruthy()
    expect(tiers[0].name).toBeTruthy()
  })
})
