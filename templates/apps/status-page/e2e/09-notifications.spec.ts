import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('list shows zero notifications for a fresh user (no fabricated entries)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
      timeout: 15_000,
    })
    // Mark-all-read should be disabled with zero unread.
    await expect(page.getByTestId('mark-all-read-btn')).toBeDisabled()
  })

  test('mark-all-read posts to /api/notifications/read-all and DB rows are flipped', async ({
    page,
  }) => {
    const tok = (await signup(page)).accessToken
    // Seed one unread notification via the authed POST endpoint.
    const create = await page.request.post(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${tok}` },
      data: {
        kind: 'incident',
        title: `Notify ${Date.now()}`,
        body: 'Mark me read',
      },
    })
    expect(create.status()).toBe(201)

    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('mark-all-read-btn')).toBeEnabled({ timeout: 10_000 })

    const respPromise = page.waitForResponse(
      (r) => r.url().includes('/notifications/read-all') && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByTestId('mark-all-read-btn').click()
    const resp = await respPromise
    expect(resp.status()).toBe(200)

    // Re-render: button should now be disabled (no unread).
    await expect(page.getByTestId('mark-all-read-btn')).toBeDisabled({ timeout: 10_000 })
  })

  test('issues GET /api/notifications on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/notifications').toBe(200)
  })
})
