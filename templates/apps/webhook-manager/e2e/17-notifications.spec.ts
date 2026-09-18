import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

const seedNotification = async (
  page: import('@playwright/test').Page,
  token: string,
  args: { severity?: 'info' | 'warning' | 'critical'; title?: string } = {},
): Promise<{ id: string }> => {
  const r = await page.request.post(API_BASE + '/notifications', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      severity: args.severity ?? 'info',
      type: 'info',
      title: args.title ?? 'Test notification',
    },
  })
  return await r.json()
}

test.describe('/notifications', () => {
  test('renders heading and filter chips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { level: 1, name: /notifications/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible()
  })

  test('GET /api/notifications fires on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/notifications/.test(x.url))
    expect(r).toBeDefined()
    expect(r!.status).toBe(200)
  })

  test('seeded critical notification appears + critical filter narrows the list', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    await seedNotification(page, token, {
      severity: 'critical',
      title: 'Critical seeded ' + Date.now(),
    })
    await seedNotification(page, token, { severity: 'info', title: 'Info seeded ' + Date.now() })

    await page.goto(APP_BASE + '/notifications')
    // Both visible under "all"
    await expect(page.getByText(/Critical seeded/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Info seeded/)).toBeVisible()
    // Switch to critical.
    // Was: `page.getByRole('button', { name: /critical/i })` — that matched TWO
    // buttons and died on strict mode: the filter chip AND the notification row
    // this very test just seeded ("Critical seeded …"), which is also a <button>.
    // Target the chip by its data-mol-id so the seed data can never shadow it.
    await page.locator('[data-mol-id="notifications-filter-critical"]').click()
    await expect(page.getByText(/Critical seeded/)).toBeVisible()
    await expect(page.getByText(/Info seeded/)).toHaveCount(0)
  })

  test('"Mark all read" sets every notification is_read = true (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    await seedNotification(page, token, {
      severity: 'info',
      title: 'Will be marked read ' + Date.now(),
    })
    await seedNotification(page, token, {
      severity: 'warning',
      title: 'Will also be marked read ' + Date.now(),
    })

    await page.goto(APP_BASE + '/notifications')
    await page.getByRole('button', { name: /mark all read/i }).click()
    await page.waitForTimeout(1500)
    // Read-after-write: GET ?filter=unread should now be empty
    const r = await page.request.get(API_BASE + '/notifications?filter=unread', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await r.json()
    expect(items.length).toBe(0)
  })
})
