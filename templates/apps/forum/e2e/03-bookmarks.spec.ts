/**
 * Bookmarks: save threads + subscribe to categories.
 * The Profile "Saved" tab and the CategoryDetail "Subscribe" button
 * both use the bookmarks resource (resourceType=thread/category).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, firstCategory, seedThread, signup } from './_helpers.js'

test.describe('forum bookmarks', () => {
  test('thread bookmark appears in profile.savedThreads', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    const thread = await seedThread(page, accessToken)

    const post = await page.request.post(`${API_BASE}/bookmarks`, {
      headers: apiHeaders(accessToken),
      data: { resourceType: 'thread', resourceId: thread.id },
      failOnStatusCode: false,
    })
    expect(post.status()).toBeLessThan(400)

    const profile = await page.request.get(`${API_BASE}/profiles/${userId}`)
    expect(profile.status()).toBeLessThan(400)
    const data = (await profile.json()) as { savedThreads?: Array<{ id: string }> }
    expect(data.savedThreads?.some((th) => th.id === thread.id)).toBe(true)
  })

  test('category bookmark toggles subscribed state', async ({ page }) => {
    const { accessToken } = await signup(page)
    const cat = await firstCategory(page)

    const post = await page.request.post(`${API_BASE}/bookmarks`, {
      headers: apiHeaders(accessToken),
      data: { resourceType: 'category', resourceId: cat.id },
      failOnStatusCode: false,
    })
    expect(post.status()).toBeLessThan(400)

    const check = await page.request.get(`${API_BASE}/bookmarks/check/category/${cat.id}`, {
      headers: apiHeaders(accessToken),
    })
    const checkBody = (await check.json()) as { bookmarked?: boolean }
    expect(checkBody.bookmarked).toBe(true)

    const del = await page.request.delete(`${API_BASE}/bookmarks/category/${cat.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(del.status()).toBeLessThan(400)

    const check2 = await page.request.get(`${API_BASE}/bookmarks/check/category/${cat.id}`, {
      headers: apiHeaders(accessToken),
    })
    const checkBody2 = (await check2.json()) as { bookmarked?: boolean }
    expect(checkBody2.bookmarked).toBe(false)
  })

  test('unauthenticated bookmark request is rejected', async ({ page }) => {
    const cat = await firstCategory(page)
    const res = await page.request.post(`${API_BASE}/bookmarks`, {
      data: { resourceType: 'category', resourceId: cat.id },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})
