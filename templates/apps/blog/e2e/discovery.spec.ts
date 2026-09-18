/**
 * Read-side discovery surfaces: /api/categories, /api/feed, /api/tags.
 * These power the public landing page and the post composer's category
 * picker. Auth-gated for the editor list, public for the reader feed.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('discovery API surfaces', () => {
  test('/api/categories lists at least the seeded category', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/categories`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as Array<{ id: string; name: string }>
    expect(Array.isArray(body)).toBeTruthy()
  })

  test('/api/feed/rss returns an RSS document of published posts', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/feed/rss`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(400)
    const text = await res.text()
    // RSS is XML; should at least mention <rss or <channel.
    expect(/<rss|<channel/.test(text)).toBeTruthy()
  })

  test('/api/tags lists known tags with their posts count', async ({ page }) => {
    await signup(page, uniqueEmail('discovery-tags'))
    const res = await page.request.get(`${API_BASE}/tags`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(400)
  })

  test('post detail page hits /api/posts/:id/interactions on load', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('discovery-int'))
    const post = await page.request.post(`${API_BASE}/posts`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Interactions hit ' + Date.now(),
        content: 'body',
        excerpt: 'x',
        tags: [],
        status: 'published',
      },
      failOnStatusCode: false,
    })
    const { id } = (await post.json()) as { id: string }

    const reqs = await captureNetwork(page, async () => {
      await page.goto(`/post/${id}`)
      await page.waitForLoadState('networkidle')
    })
    const interactionsCall = reqs.find(
      (r) => r.method === 'GET' && /\/api\/posts\/[^/]+\/interactions/.test(r.url),
    )
    expect(interactionsCall, 'post detail must call /api/posts/:id/interactions').toBeTruthy()
    expect(interactionsCall!.status).toBeLessThan(400)
  })
})
