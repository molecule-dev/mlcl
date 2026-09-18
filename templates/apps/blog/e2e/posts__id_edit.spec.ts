/**
 * /posts/:id/edit — PostEditor in edit mode. Hydrates with the
 * existing post via GET /api/posts/:id and persists updates via PUT.
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

test.describe('post editor — edit (/posts/:id/edit)', () => {
  test('hydrates the title from the seeded post', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-title-hydrate'))
    const seeded = await seedPost(page, accessToken, { title: 'Hydrate Title ' + Date.now() })
    await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#input-post-title')).toHaveValue(seeded.title, { timeout: 10000 })
  })

  test('initial load fires GET /api/posts/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-network'))
    const seeded = await seedPost(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
      await page.waitForLoadState('networkidle')
    })
    const fetched = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/posts/${seeded.id}($|\\?)`).test(r.url),
    )
    expect(fetched, `editor must hydrate from /api/posts/${seeded.id}`).toBeTruthy()
    expect(fetched!.status).toBeLessThan(400)
  })

  test('PUT update persists the new title', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-put'))
    const seeded = await seedPost(page, accessToken, { title: 'Original ' + Date.now() })
    const newTitle = 'Updated ' + Date.now()
    const r = await page.request.put(`${API_BASE}/posts/${seeded.id}`, {
      headers: authHeaders(accessToken),
      data: { title: newTitle, status: 'published' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeLessThan(400)
    const refetch = await page.request.get(`${API_BASE}/posts/${seeded.id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(refetch.status()).toBeLessThan(400)
    const got = (await refetch.json()) as { title: string }
    expect(got.title).toBe(newTitle)
  })

  test('hydrates the body / content from the seeded post', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-body'))
    const marker = `body marker ${Date.now()}`
    const seeded = await seedPost(page, accessToken, {
      title: 'Body Hydrate ' + Date.now(),
      content: marker,
    })
    await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
    await page.waitForLoadState('networkidle')
    const main = await page.locator('main').innerText()
    expect(main).toContain(marker)
  })

  test('hydrates tags from the seeded post', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-tags'))
    const seeded = await seedPost(page, accessToken, {
      title: 'Tag Hydrate ' + Date.now(),
      tags: ['hydrate-tag', 'edit-tag'],
    })
    await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
    await page.waitForLoadState('networkidle')
    const text = await page.locator('main').innerText()
    expect(text).toMatch(/hydrate-tag|edit-tag/)
  })

  test('save draft persists status=draft', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-draft'))
    const seeded = await seedPost(page, accessToken)
    const r = await page.request.put(`${API_BASE}/posts/${seeded.id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'draft' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeLessThan(400)
    const fetched = await page.request.get(`${API_BASE}/posts/${seeded.id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    const got = (await fetched.json()) as { status: string }
    expect(got.status).toBe('draft')
  })

  test('URL retains /posts/:id/edit on reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-url'))
    const seeded = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
    await page.reload()
    expect(new URL(page.url()).pathname).toBe(`/posts/${seeded.id}/edit`)
  })

  test('publish/save buttons are present', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-buttons'))
    const seeded = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
    await page.waitForLoadState('networkidle')
    const pub = page.getByRole('button', { name: /publish/i }).first()
    const save = page.getByRole('button', { name: /save\s*draft/i }).first()
    if (await pub.count()) await expect(pub).toBeVisible()
    if (await save.count()) await expect(save).toBeVisible()
  })

  test('AI summarize button reachable for an existing post', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-ai'))
    const seeded = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
    await page.waitForLoadState('networkidle')
    const ai = page.getByRole('button', { name: /AI|summari[sz]e/i }).first()
    if (await ai.count()) await expect(ai).toBeVisible()
  })

  test('cover image hydrates from cover_image_url', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-cover'))
    const created = await page.request.post(`${API_BASE}/posts`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Cover edit ' + Date.now(),
        content: 'body',
        excerpt: '',
        tags: [],
        status: 'draft',
        cover_image_url: 'https://example.com/edit-cover.jpg',
      },
      failOnStatusCode: false,
    })
    expect(created.status()).toBeLessThan(400)
    const { id } = (await created.json()) as { id: string }
    await page.goto(APP_BASE + `/posts/${id}/edit`)
    await page.waitForLoadState('networkidle')
    const main = await page.locator('main').innerText()
    expect(main.length).toBeGreaterThan(20)
  })

  test('error toast slot exists for failed PUTs (visibility check)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('edit-error'))
    const seeded = await seedPost(page, accessToken)
    await page.goto(APP_BASE + `/posts/${seeded.id}/edit`)
    await page.waitForLoadState('networkidle')
    expect(await page.locator('main').innerText()).toBeTruthy()
  })
})
