import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders the notifications heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /^Notifications$/i, level: 1 })).toBeVisible()
  })

  test('shows one of: empty state, welcome card, or notification list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')

    const empty = page.locator('[data-mol-id="notifications-empty"]')
    const list = page.locator('[data-mol-id="notifications-list"]')
    await expect(empty.or(list)).toBeVisible()
  })

  test('fetches the user-scoped courses to derive notifications', async ({ page }) => {
    await signup(page)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })

    const coursesCalls = reqs.filter(
      (r) => r.method === 'GET' && /\/api\/courses\?my=true/.test(r.url),
    )
    expect(coursesCalls.length).toBeGreaterThan(0)
    expect(coursesCalls.every((r) => r.status < 400)).toBe(true)
  })
})
