import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createThread,
  pickCategory,
  signup,
} from './_helpers.js'

test.describe('bookmarks', () => {
  test('Bookmarks page renders the eyebrow + h1 (no raw {{key}} placeholder)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookmarks')
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
    const text = await heading.innerText()
    expect(text).not.toMatch(/\{\{/)
  })

  test('Empty state renders when the user has no bookmarks', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/bookmarks')
    await expect(page.getByText(/haven't saved any|no\s+bookmarks/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('GET /api/bookmarks-rich fires on Bookmarks page load (captureNetwork invariant)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/bookmarks')
      await page.waitForTimeout(1500)
    })
    const list = reqs.find((r) => /\/api\/bookmarks-rich$/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/bookmarks-rich must fire on Bookmarks page load').toBeTruthy()
    expect(list!.status).toBe(200)
  })

  test('Bookmarking a thread persists and shows up in /bookmarks', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Worth saving ${Date.now()}`,
      body: 'I want to remember this thread.',
      categoryId: category.id,
    })

    const post = await page.request.post(`${API_BASE}/threads/${thread.id}/bookmark`)
    expect(post.status()).toBeLessThan(400)
    const bookmarked = (await post.json()).bookmarked
    expect(bookmarked).toBe(true)

    const status = await page.request.get(`${API_BASE}/threads/${thread.id}/bookmark`)
    expect(status.status()).toBe(200)
    expect((await status.json()).bookmarked).toBe(true)

    const list = await page.request.get(`${API_BASE}/bookmarks-rich`)
    expect(list.status()).toBe(200)
    const items = (await list.json()).data ?? []
    const found = items.find(
      (b: { thread: { id: string; title: string } }) => b.thread.id === thread.id,
    )
    expect(found, 'bookmarks-rich must include the just-bookmarked thread').toBeTruthy()
    expect(found.thread.title).toBe(thread.title)

    await page.goto(APP_BASE + '/bookmarks')
    await expect(page.getByText(thread.title)).toBeVisible({ timeout: 15_000 })
  })

  test('Folder group heading "Saved" renders above bookmarked rows', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Folder group ${Date.now()}`,
      body: 'group me',
      categoryId: category.id,
    })
    await page.request.post(`${API_BASE}/threads/${thread.id}/bookmark`)

    await page.goto(APP_BASE + '/bookmarks')
    await expect(page.getByText(thread.title)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Saved/i).first()).toBeVisible()
  })

  test('Each bookmark ThreadRow exposes a /t/:id-or-slug link', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Linked row ${Date.now()}`,
      body: 'linked',
      categoryId: category.id,
    })
    await page.request.post(`${API_BASE}/threads/${thread.id}/bookmark`)

    await page.goto(APP_BASE + '/bookmarks')
    await expect(page.getByText(thread.title)).toBeVisible({ timeout: 15_000 })
    const link = page.locator('a[href^="/t/"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })
  })

  test('Unsave click DELETEs /api/bookmarks/:id and removes the row', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Unsave clickable ${Date.now()}`,
      body: 'unsave-me',
      categoryId: category.id,
    })
    await page.request.post(`${API_BASE}/threads/${thread.id}/bookmark`)

    await page.goto(APP_BASE + '/bookmarks')
    await expect(page.getByText(thread.title)).toBeVisible({ timeout: 15_000 })
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Unsave/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const del = reqs.find((r) => /\/api\/bookmarks\/[^/]+$/.test(r.url) && r.method === 'DELETE')
    expect(del, 'DELETE /api/bookmarks/:id must fire on Unsave click').toBeTruthy()
    expect(del!.status).toBeLessThan(400)
    await expect(page.getByText(thread.title)).not.toBeVisible({ timeout: 10_000 })
  })

  test('Unsave persists across reload — the row does not reappear', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Unsave persists ${Date.now()}`,
      body: 'persist-me',
      categoryId: category.id,
    })
    await page.request.post(`${API_BASE}/threads/${thread.id}/bookmark`)
    await page.goto(APP_BASE + '/bookmarks')
    await expect(page.getByText(thread.title)).toBeVisible({ timeout: 15_000 })
    await page
      .getByRole('button', { name: /Unsave/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    await page.reload()
    await expect(page.getByText(thread.title)).not.toBeVisible({ timeout: 10_000 })
  })

  test('removing a bookmark drops it from the saved list (API invariant)', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Will be unsaved ${Date.now()}`,
      body: 'temporary',
      categoryId: category.id,
    })
    await page.request.post(`${API_BASE}/threads/${thread.id}/bookmark`)
    const del = await page.request.delete(`${API_BASE}/threads/${thread.id}/bookmark`)
    expect(del.status()).toBeLessThan(400)
    const status = await page.request.get(`${API_BASE}/threads/${thread.id}/bookmark`)
    expect((await status.json()).bookmarked).toBe(false)

    const list = await page.request.get(`${API_BASE}/bookmarks-rich`)
    const items = (await list.json()).data ?? []
    expect(
      items.find((b: { thread: { id: string } }) => b.thread.id === thread.id),
      'unsaved thread must be removed from bookmarks-rich',
    ).toBeFalsy()
  })
})
