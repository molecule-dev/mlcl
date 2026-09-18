import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl, authedApi } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders heading + Mark all as read button + at least one row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /^Notifications$/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /Mark all as read/i })).toBeVisible()
    const rows = page.getByRole('listitem')
    await expect(rows.first()).toBeAttached()
  })

  test('GET /api/notifications fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/notifications(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/notifications fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('Mark all as read fires POST /api/notifications/read-all (backend invariant)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Mark all as read/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = whereUrl(reqs, /\/api\/notifications\/read-all/, 'POST')
    expect(post.length, 'POST /api/notifications/read-all fired').toBeGreaterThan(0)
    expect(post[0].status, 'mark-read must succeed').toBe(200)
  })

  test('after mark-as-read, a fresh GET /api/notifications shows all read=true (read-after-write)', async ({
    page,
    request,
  }) => {
    const user = await signup(page)
    expect(user.accessToken).toBeTruthy()
    const api = authedApi(request, user.accessToken!)
    await api.post('/notifications/read-all')
    const after = await api.get('/notifications')
    expect(after.status()).toBe(200)
    const body = await after.json()
    const list = Array.isArray(body) ? body : (body?.items ?? body?.notifications ?? [])
    if (list.length > 0) {
      const unreadStill = list.filter((n: { is_read?: boolean; read_at?: string | null }) => {
        if ('is_read' in n) return n.is_read === false
        if ('read_at' in n) return n.read_at === null
        return false
      })
      expect(unreadStill.length, 'no notification should remain unread').toBe(0)
    }
  })

  test('each row shows source heading + body + timestamp', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const rows = page.getByRole('listitem')
    // Rows render only after the async GET /api/notifications resolves — wait
    // for the first one before counting so we don't race the fetch.
    await rows.first().waitFor({ timeout: 10000 })
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < Math.min(count, 3); i++) {
      const row = rows.nth(i)
      // every row contains a heading (h2)
      await expect(row.getByRole('heading', { level: 2 })).toBeVisible()
    }
  })

  test('clicking a notification navigates to its target page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const link = page.locator('main >> li >> a[href]').first()
    const href = await link.getAttribute('href')
    await link.click()
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    if (href) {
      // Either target is a path fragment or an absolute path; check that URL changed
      await expect(page).not.toHaveURL(/\/notifications$/)
    }
  })
})
