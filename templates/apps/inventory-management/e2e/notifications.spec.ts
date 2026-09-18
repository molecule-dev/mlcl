import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

interface ApiNotification {
  id: string
  user_id: string
  read: boolean
  title: string
  body: string
}

test.describe('notifications', () => {
  test('lists system notifications scoped to the user', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('notif-list'))
    await primeDashboard(page, accessToken)

    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const list = (await res.json()) as ApiNotification[]
    // Non-empty, not a count: how many notifications the app starts with is
    // demo content, but every one of them being the caller's is the invariant.
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((n) => n.user_id === userId)).toBeTruthy()
  })

  test('mark a single notification as read flips read=true', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-read'))
    await primeDashboard(page, accessToken)

    const list = await page.request
      .get(`${API_BASE}/notifications?read=false`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiNotification[]>)
    expect(list.length).toBeGreaterThan(0)
    const target = list[0]

    const update = await page.request.post(`${API_BASE}/notifications/${target.id}/read`, {
      headers: authHeaders(accessToken),
      data: { read: true },
      failOnStatusCode: false,
    })
    expect(update.status()).toBe(200)

    const reread = await page.request
      .get(`${API_BASE}/notifications?read=true`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiNotification[]>)
    expect(reread.find((n) => n.id === target.id)).toBeTruthy()
  })

  test('mark-all-read flips every unread notification', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-mass'))
    await primeDashboard(page, accessToken)

    const before = await page.request
      .get(`${API_BASE}/notifications?read=false`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiNotification[]>)
    expect(before.length).toBeGreaterThan(0)

    const update = await page.request.post(`${API_BASE}/notifications/mark-all-read`, {
      headers: authHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    expect(update.status()).toBe(200)

    const after = await page.request
      .get(`${API_BASE}/notifications?read=false`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiNotification[]>)
    expect(after.length).toBe(0)
  })

  test('Notifications page renders alerts/movements/system tabs without console errors', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-ui'))
    await primeDashboard(page, accessToken)

    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const notifCall = reqs.find((r) => /\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
    expect(notifCall?.status, 'GET /notifications fired').toBe(200)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
      timeout: 10_000,
    })
    // tab nav
    await page.getByRole('button', { name: /^alerts$/i }).click()
    await page.getByRole('button', { name: /^movement$/i }).click()
    await page.getByRole('button', { name: /^system$/i }).click()

    // A "Network error … TypeError: Failed to fetch" can fire when the
    // signup→dashboard snapshot fetch is mid-flight and we navigate to
    // /notifications before it resolves. That is a benign abort, not a
    // real failure of the page under test, so we filter it out.
    const fatal = errors.filter(
      (e) =>
        !/favicon|Failed to load resource|net::ERR_/.test(e) &&
        !/Network error.*\/api\/dashboard\/snapshot.*Failed to fetch/.test(e),
    )
    expect(fatal, 'no fatal console errors on /notifications').toEqual([])
  })
})
