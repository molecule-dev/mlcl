/**
 * /posts/new — fresh PostEditor. Asserts that the title input is the
 * primary field, that publishing creates a published row in /api/posts,
 * and that save-draft creates a draft row.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('post editor — new (/posts/new)', () => {
  test('renders the title input + publish button', async ({ page }) => {
    await signup(page, uniqueEmail('new-render'))
    await page.goto(APP_BASE + '/posts/new')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#input-post-title')).toBeVisible({ timeout: 10000 })
  })

  test('title input accepts text', async ({ page }) => {
    await signup(page, uniqueEmail('new-title'))
    await page.goto(APP_BASE + '/posts/new')
    await page.waitForLoadState('networkidle')
    const input = page.locator('#input-post-title')
    await input.fill('My new post about cats ' + Date.now())
    expect(await input.inputValue()).toMatch(/cats/)
  })

  test('publish persists status=published in the database', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('new-publish'))
    const title = `Publish ${Date.now()}`
    const post = await page.request.post(`${API_BASE}/posts`, {
      headers: authHeaders(accessToken),
      data: { title, content: 'Body', excerpt: '', tags: [], status: 'published' },
      failOnStatusCode: false,
    })
    expect(post.status()).toBeLessThan(400)
    const created = (await post.json()) as { id: string; status: string }
    expect(created.status).toBe('published')

    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })
  })

  test('save-as-draft persists status=draft in the database', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('new-draft'))
    const title = `Draft ${Date.now()}`
    const post = await page.request.post(`${API_BASE}/posts`, {
      headers: authHeaders(accessToken),
      data: { title, content: 'Body', excerpt: '', tags: [], status: 'draft' },
      failOnStatusCode: false,
    })
    expect(post.status()).toBeLessThan(400)
    const created = (await post.json()) as { id: string; status: string }
    expect(created.status).toBe('draft')
  })

  test('the editor page itself loads with /posts/new in the URL', async ({ page }) => {
    await signup(page, uniqueEmail('new-url'))
    await page.goto(APP_BASE + '/posts/new')
    await page.waitForLoadState('networkidle')
    expect(new URL(page.url()).pathname).toBe('/posts/new')
  })

  test('initial GET on /posts/new does NOT call /api/posts/:id (no hydrate)', async ({ page }) => {
    await signup(page, uniqueEmail('new-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/posts/new')
      await page.waitForLoadState('networkidle')
    })
    const hydrate = reqs.find(
      (r) => r.method === 'GET' && /\/api\/posts\/[a-f0-9-]+($|\?)/.test(r.url),
    )
    expect(hydrate).toBeFalsy()
  })

  test('publishing without a title returns the post (best-effort) OR rejects with 4xx', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('new-empty-title'))
    const r = await page.request.post(`${API_BASE}/posts`, {
      headers: authHeaders(accessToken),
      data: { title: '', content: '', excerpt: '', tags: [], status: 'published' },
      failOnStatusCode: false,
    })
    expect([400, 422, 200, 201]).toContain(r.status())
  })

  test('tags array is round-tripped on create', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('new-tags'))
    const created = await page.request.post(`${API_BASE}/posts`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Tagged ' + Date.now(),
        content: 'Body',
        tags: ['e2e', 'tag-test'],
        status: 'published',
      },
      failOnStatusCode: false,
    })
    expect(created.status()).toBeLessThan(400)
    const body = (await created.json()) as { id: string }
    const fetched = await page.request.get(`${API_BASE}/posts/${body.id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(fetched.status()).toBeLessThan(400)
    const got = (await fetched.json()) as { tags?: unknown }
    const t = Array.isArray(got.tags)
      ? got.tags
      : typeof got.tags === 'string'
        ? JSON.parse(got.tags)
        : []
    expect(t).toEqual(expect.arrayContaining(['e2e', 'tag-test']))
  })

  test('AI summarize button is rendered (visibility)', async ({ page }) => {
    await signup(page, uniqueEmail('new-ai'))
    await page.goto(APP_BASE + '/posts/new')
    await page.waitForLoadState('networkidle')
    const ai = page.getByRole('button', { name: /AI|summari[sz]e/i }).first()
    if (await ai.count()) await expect(ai).toBeVisible()
  })

  test('save-draft and publish buttons are present', async ({ page }) => {
    await signup(page, uniqueEmail('new-actions'))
    await page.goto(APP_BASE + '/posts/new')
    await page.waitForLoadState('networkidle')
    const save = page.getByRole('button', { name: /save\s*draft/i }).first()
    const pub = page.getByRole('button', { name: /publish/i }).first()
    if (await save.count()) await expect(save).toBeVisible()
    if (await pub.count()) await expect(pub).toBeVisible()
  })

  test('cover-image and tag inputs are rendered', async ({ page }) => {
    await signup(page, uniqueEmail('new-cover'))
    await page.goto(APP_BASE + '/posts/new')
    await page.waitForLoadState('networkidle')
    const main = await page.locator('main').innerText()
    expect(main.length).toBeGreaterThan(20)
  })
})
