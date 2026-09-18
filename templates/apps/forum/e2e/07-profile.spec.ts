/**
 * Public profile endpoint and Profile page tabs (Posts / Comments / Saved).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, seedThread, signup } from './_helpers.js'

test.describe('forum profile', () => {
  test('GET /profiles/:id returns the public projection + stats + tabs data', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    await seedThread(page, accessToken, { title: 'profile-thread' })

    const res = await page.request.get(`${API_BASE}/profiles/${userId}`)
    expect(res.status()).toBeLessThan(400)
    const data = (await res.json()) as {
      user?: { id?: string; role?: string }
      stats?: { postCount?: number; commentCount?: number; karma?: number }
      recentThreads?: Array<{ id: string }>
      recentReplies?: Array<{ id: string }>
      savedThreads?: Array<{ id: string }>
    }
    expect(data.user?.id).toBe(userId)
    expect(typeof data.stats?.postCount).toBe('number')
    expect(data.stats?.postCount ?? 0).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(data.recentThreads)).toBe(true)
    expect(Array.isArray(data.recentReplies)).toBe(true)
    expect(Array.isArray(data.savedThreads)).toBe(true)
  })

  test('GET /profiles/:nonsense → 404', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/profiles/not-a-real-user-${Date.now()}`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(404)
  })

  test('Profile page renders the user\u2019s display info', async ({ page }) => {
    const { userId } = await signup(page)
    await page.goto(APP_BASE + '/u/' + userId)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('updating user persists via PATCH /api/users/:id', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    const newName = 'E2E Name ' + Date.now()
    const res = await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
      data: { name: newName },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(400)

    const after = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
    })
    expect(after.status()).toBeLessThan(400)
    const body = (await after.json()) as { props?: { name?: string } }
    expect(body.props?.name).toBe(newName)
  })
})
