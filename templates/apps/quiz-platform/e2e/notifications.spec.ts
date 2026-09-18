import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bearerToken,
  captureNetwork,
  flipThemeAndAssertChanged,
  signup,
} from './_helpers.js'

test.describe('/notifications', () => {
  test('renders header brand link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('link', { name: /^sparq/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await flipThemeAndAssertChanged(page)
  })

  test('user-menu opens with menu items', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test('GET /api/notifications fires on load and returns seeded items (gate-12)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const notifs = reqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url))
    expect(notifs).toBeTruthy()
    expect(notifs?.status).toBe(200)
    // Backend seeds 3 starter notifications for new users.
    await expect(page.locator('[data-testid="notifications"] li').first()).toBeVisible()
  })

  test('"Mark all as read" POSTs read-all and zeroes unread (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const token = await bearerToken(page)
    const before = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(token),
    })
    const beforeBody = (await before.json()) as Array<{ read: boolean }>
    const beforeUnread = beforeBody.filter((n) => !n.read).length
    expect(beforeUnread).toBeGreaterThan(0)

    await page.getByTestId('mark-all-read').click()
    await page.waitForLoadState('networkidle')

    const after = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(token),
    })
    const afterBody = (await after.json()) as Array<{ read: boolean }>
    expect(afterBody.filter((n) => !n.read).length).toBe(0)
  })

  test('"All" tab is selected by default and shows all rows', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /^all$/i }).first()).toBeVisible()
    const rows = page.locator('[data-testid="notifications"] li[data-testid^="notification-"]')
    await expect(rows.first()).toBeVisible()
  })

  test('"Unread" tab filters out read notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('mark-all-read').click()
    await page.getByRole('button', { name: /^unread$/i }).click()
    const unreadRows = page.locator('[data-testid="notification-unread"]')
    await expect(unreadRows).toHaveCount(0)
  })

  test('every notification with an href renders a link to it', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    // Read the rows from the API rather than naming the starter
    // notifications — their titles and links are content, and the app's
    // own notifications replace them.
    const token = await bearerToken(page)
    const res = await page.request.get(`${API_BASE}/notifications`, { headers: apiHeaders(token) })
    expect(res.status()).toBe(200)
    const rows = (await res.json()) as Array<{ title: string; href: string | null }>
    const linked = rows.filter((n) => Boolean(n.href))
    expect(linked.length, 'at least one notification must carry a link').toBeGreaterThan(0)
    for (const n of linked) {
      // The row's link text is exactly the notification title.
      await expect(page.getByRole('link', { name: n.title }).first()).toHaveAttribute(
        'href',
        n.href!,
      )
    }
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
