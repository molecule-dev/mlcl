import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Notifications page', () => {
  test('empty inbox state renders when no notifications exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="notif-empty"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="notif-unread-count"]')).toContainText('0')
  })

  test('items render from /api/notifications and unread count reflects backend state', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    await api.post('/notifications', {
      kind: 'critical_finding',
      title: 'Critical SQL injection in auth.ts',
    })
    await api.post('/notifications', { kind: 'pr_opened', title: 'PR #42 opened by alice' })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="notif-feed"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(2)
    await expect(page.locator('[data-mol-id="notif-unread-count"]')).toContainText('2')
  })

  test('Mark as read on a single item POSTs /:id/read and badge flips to "Read"', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/notifications', { kind: 'mention', title: 'You were @-mentioned in PR #11' })
    ).json()
    await page.goto(APP_BASE + '/notifications')
    const item = page.locator(`[data-mol-id="notif-item"][data-notif-id="${created.id}"]`)
    await expect(item).toHaveAttribute('data-unread', 'true')
    const respPromise = page.waitForResponse(
      (r) =>
        new RegExp(`/api/notifications/${created.id}/read`).test(r.url()) &&
        r.request().method() === 'POST',
      { timeout: 10000 },
    )
    await item.locator('[data-mol-id="notif-mark-read"]').click()
    const resp = await respPromise
    expect(resp.status()).toBe(200)
    await expect(item).toHaveAttribute('data-unread', 'false', { timeout: 5000 })
    // backend invariant: read_at is now set
    const after = await (await api.get(`/notifications/${created.id}`)).json()
    expect(after.read_at).toBeTruthy()
  })

  test('Mark all as read POSTs every unread notification and unread badge drops to 0', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created: { id: string }[] = []
    for (let i = 0; i < 3; i++) {
      const resp = await api.post('/notifications', {
        kind: 'system_message',
        title: 'Bulk notif ' + i,
      })
      created.push(await resp.json())
    }
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="notif-unread-count"]')).toContainText('3')
    // The handler does optimistic UI first then fires the POSTs in parallel.
    // Wait on each individual POST response (not the badge text) so the
    // captures cover the actual network calls and we don't race the loop.
    const respPromises = created.map((c) =>
      page.waitForResponse(
        (r) =>
          new RegExp(`/api/notifications/${c.id}/read`).test(r.url()) &&
          r.request().method() === 'POST',
        { timeout: 10000 },
      ),
    )
    await page.locator('[data-mol-id="notif-mark-all-read"]').click()
    const responses = await Promise.all(respPromises)
    expect(responses.length).toBe(3)
    expect(responses.every((r) => r.status() === 200)).toBe(true)
    await expect(page.locator('[data-mol-id="notif-unread-count"]')).toContainText('0', {
      timeout: 8000,
    })
    const list = await (await api.get('/notifications')).json()
    expect(list.every((n: { read_at: string | null }) => Boolean(n.read_at))).toBe(true)
  })

  test('filter buttons restrict visible notifications by kind', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    await api.post('/notifications', { kind: 'critical_finding', title: 'Critical issue 1' })
    await api.post('/notifications', { kind: 'pr_opened', title: 'PR opened 1' })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(2)
    await page.getByRole('button', { name: /^critical$/i }).click()
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(1)
    await page.getByRole('button', { name: /^pr events$/i }).click()
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(1)
    await page.getByRole('button', { name: /^all$/i }).click()
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(2)
  })

  test('mark-all-read state survives reload', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    await api.post('/notifications', { kind: 'system_message', title: 'persist-test' })
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-mol-id="notif-mark-all-read"]').click()
    await expect(page.locator('[data-mol-id="notif-unread-count"]')).toContainText('0')
    await page.reload()
    await expect(page.locator('[data-mol-id="notif-unread-count"]')).toContainText('0')
  })

  test('AuthGuard redirects anonymous visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('initial load fires GET /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const gets = whereUrl(reqs, /\/api\/notifications(?:\?|$)/, 'GET')
    expect(gets.length, 'expected GET /api/notifications on load').toBeGreaterThan(0)
    expect(gets[0]!.status).toBe(200)
  })

  test('Critical filter button has aria-pressed=true when active', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    await api.post('/notifications', { kind: 'critical_finding', title: 'Critical 1' })
    await page.goto(APP_BASE + '/notifications')
    const btn = page.getByRole('button', { name: /^critical$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('All filter button is the default active state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const allBtn = page.getByRole('button', { name: /^all$/i })
    await expect(allBtn).toBeVisible()
    await expect(allBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('filter buttons for Mentions and System are present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('button', { name: /^mentions$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^system$/i })).toBeVisible()
  })

  test('critical_finding notif appears in the feed and matches the Critical filter', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    await api.post('/notifications', {
      kind: 'critical_finding',
      title: 'Critical alert ' + Date.now(),
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(1)
    await page.getByRole('button', { name: /^critical$/i }).click()
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(1)
    await page.getByRole('button', { name: /^mentions$/i }).click()
    await expect(page.locator('[data-mol-id="notif-item"]')).toHaveCount(0)
  })

  test('mark-as-read invariant: backend read_at is set after UI click', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/notifications', { kind: 'mention', title: 'invariant-mark' })
    ).json()
    const before = await (await api.get(`/notifications/${created.id}`)).json()
    expect(before.read_at).toBeFalsy()
    await page.goto(APP_BASE + '/notifications')
    const item = page.locator(`[data-mol-id="notif-item"][data-notif-id="${created.id}"]`)
    const respPromise = page.waitForResponse(
      (r) =>
        new RegExp(`/api/notifications/${created.id}/read`).test(r.url()) &&
        r.request().method() === 'POST',
      { timeout: 10000 },
    )
    await item.locator('[data-mol-id="notif-mark-read"]').click()
    await respPromise
    await expect(item).toHaveAttribute('data-unread', 'false', { timeout: 5000 })
    const after = await (await api.get(`/notifications/${created.id}`)).json()
    expect(after.read_at).toBeTruthy()
  })
})
