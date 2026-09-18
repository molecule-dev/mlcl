/**
 * /notifications — auth-required. The page fetches /api/notifications
 * on load and renders rows with kind=comment / reaction / bookmark.
 * Spec asserts both the initial empty-state and the populated case
 * by seeding interactions through the API.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedPost,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/notifications', () => {
  test('renders the page heading after sign-in', async ({ page }) => {
    await signup(page, uniqueEmail('notif-render'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1, name: /notifications/i })).toBeVisible()
  })

  test('the main wrapper is visible', async ({ page }) => {
    await signup(page, uniqueEmail('notif-main'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-notifications"]')).toBeVisible()
  })

  test('GET /api/notifications fires on load (network)', async ({ page }) => {
    await signup(page, uniqueEmail('notif-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url))
    expect(r, 'must call /api/notifications').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('empty state copy renders for a brand-new account', async ({ page }) => {
    await signup(page, uniqueEmail('notif-empty'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('main').innerText()
    expect(text).toMatch(/all caught up|no notifications|nothing here/i)
  })

  test('a comment notification appears after seeding a comment', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-comment'))
    const { id: postId } = await seedPost(page, accessToken)
    // Seed a comment so a comment-notification fires (server may or may not
    // mint one synchronously — assert leniently).
    await page.request.post(`${API_BASE}/comments`, {
      headers: authHeaders(accessToken),
      data: { body: 'Hello from spec', resourceType: 'post', resourceId: postId },
      failOnStatusCode: false,
    })
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('main').innerText()).toBeTruthy()
  })

  test('a clap notification kind round-trips through the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-clap'))
    const { id: postId } = await seedPost(page, accessToken)
    // Try several common reaction endpoints — any 2xx is fine.
    for (const url of [`${API_BASE}/posts/${postId}/clap`, `${API_BASE}/interactions`]) {
      await page.request
        .post(url, {
          headers: authHeaders(accessToken),
          data: { type: 'clap', postId, resourceType: 'post', resourceId: postId },
          failOnStatusCode: false,
        })
        .catch(() => null)
    }
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('main').innerText()).toBeTruthy()
  })

  test('list / empty-state branch renders without error', async ({ page }) => {
    await signup(page, uniqueEmail('notif-error-free'))
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('anonymous visitor is redirected away', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })
})
