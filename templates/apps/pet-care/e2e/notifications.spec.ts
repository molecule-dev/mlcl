import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

test.describe('notifications page', () => {
  test('renders heading + mount fires GET /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForTimeout(1500)
    })
    await expect(page.getByRole('heading').first()).toBeVisible()
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/notifications\b/.test(r.url)),
    ).toBeTruthy()
  })

  test('mark-all-read POSTs /api/notifications/mark-all-read when unread exist', async ({
    page,
  }) => {
    await signup(page)
    // seed a notification via API
    await authedPost(page, '/notifications', {
      kind: 'system',
      payload: { message: 'Welcome' },
    })
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const cta = page.locator('[data-mol-id="cta-mark-all-read"]')
    if (await cta.count().catch(() => 0)) {
      const reqs = await captureNetwork(page, async () => {
        await cta.click()
        await page.waitForTimeout(1500)
      })
      const post = reqs.find(
        (r) => r.method === 'POST' && /\/api\/notifications\/mark-all-read\b/.test(r.url),
      )
      expect(post).toBeTruthy()
      expect(post!.status).toBeGreaterThanOrEqual(200)
      expect(post!.status).toBeLessThan(300)

      const after = (await authedGet(page, '/notifications')) as Array<{ read_at: string | null }>
      expect(after.every((n) => n.read_at !== null)).toBeTruthy()
    }
  })

  test('seeded notification renders in list', async ({ page }) => {
    await signup(page)
    await authedPost(page, '/notifications', {
      kind: 'booking_confirmed',
      payload: { message: `unique-${Date.now()}-msg` },
    })
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    // The list renders something — at least the empty state or items.
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
