import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders Notifications h1', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /^Notifications$/i, level: 1 })).toBeVisible()
  })

  test('GET /api/notifications fires on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const get = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get, 'GET /api/notifications should fire on /notifications').toBeTruthy()
    expect(get!.status).toBeLessThan(300)
  })

  test('shows empty-state copy for fresh user', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.getByText(/No notifications/i)).toBeVisible({ timeout: 10_000 })
  })

  test('after seeding via API the new notification appears (read-after-write)', async ({
    page,
  }) => {
    const title = 'Seeded ' + Date.now()
    const post = await page.request.post(API_BASE + '/notifications', {
      data: { type: 'system_message', title, body: 'Hello world' },
    })
    expect(post.ok(), `POST /api/notifications failed: ${post.status()}`).toBeTruthy()
    expect(post.status()).toBe(201)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })
  })
})
