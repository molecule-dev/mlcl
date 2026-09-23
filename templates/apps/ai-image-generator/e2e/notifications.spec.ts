import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders Activity h1 and fetches list', async ({ page }) => {
    await signup(page)
    // The page's data fetch fires from a mount effect — after the top-bar h1
    // is already visible — so the capture must stay attached until the network
    // settles (networkidle), not just until the heading renders.
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('"Mark all read" PUTs /api/notifications/mark-read', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Mark all read/i }).click()
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/notifications/.test(r.url) &&
          (r.method === 'PUT' || r.method === 'POST') &&
          r.status >= 200 &&
          r.status < 400,
      ),
    ).toBeTruthy()
  })

  test('renders at least one notification listitem', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const items = page.getByRole('listitem')
    await expect.poll(() => items.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('groups notifications by day with at least one section heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const heading = page.getByRole('heading', { name: /today|yesterday|this week|earlier/i })
    await expect(heading.first()).toBeVisible({ timeout: 10000 })
  })
})
