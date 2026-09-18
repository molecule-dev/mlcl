import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  createThread,
  pickCategory,
  signup,
} from './_helpers.js'

test.describe('threads', () => {
  test('Compose form creates a real thread and the next read shows it', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/compose?category=${category.slug}`)

    const title = `Probe: dialogue with the Stoics ${Date.now()}`
    const body = `# Hello\n\nThis is a test-driven thread to verify creation persists.`

    await page.locator('#compose-title').fill(title)
    await page.locator('#compose-body').fill(body)

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Publish thread|Publish/i })
        .first()
        .click()
      // Either we navigate to the new thread or we stay on compose with feedback.
      await page.waitForLoadState('networkidle', { timeout: 15_000 })
    })

    const post = reqs.find((r) => /\/api\/threads(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'a POST /api/threads must have fired').toBeTruthy()
    expect(post!.status, `POST /threads must succeed. saw ${post!.status}`).toBeLessThan(400)

    // Read-after-write: the new thread shows up in the threads listing.
    const list = await page.request.get(`${API_BASE}/threads`)
    expect(list.status()).toBe(200)
    const data = (await list.json()).data ?? []
    const found = data.find((t: { title: string }) => t.title === title)
    expect(found, 'newly created thread must be in the threads list').toBeTruthy()
    expect(found.author.username).toBeTruthy()
    expect(found.category.slug).toBe(category.slug)
  })

  test('ThreadView shows posts from the API and reply persists into the next GET', async ({
    page,
  }) => {
    const { name } = await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Reply test thread ${Date.now()}`,
      body: 'Original post body — nice to meet you.',
      categoryId: category.id,
    })
    expect(thread.id).toBeTruthy()

    await page.goto(APP_BASE + '/t/' + thread.id)
    // Original post body is visible.
    await expect(page.getByText(/Original post body/i)).toBeVisible({ timeout: 15_000 })
    // Use signup name to find author (skipping over UI rendering details).
    expect(name).toBeTruthy()

    // Add a reply through the UI.
    const replyText = `A real reply ${Date.now()}`
    await page.locator('#thread-reply').fill(replyText)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Post reply$/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 15_000 })
    })
    const replyCall = reqs.find(
      (r) => /\/api\/threads\/[\w-]+\/posts$/.test(r.url) && r.method === 'POST',
    )
    expect(replyCall, 'a POST /api/threads/:id/posts must have fired').toBeTruthy()
    expect(replyCall!.status).toBeLessThan(400)

    // Read-after-write: the GET /threads/:id endpoint must show the new reply.
    const after = await page.request.get(`${API_BASE}/threads/${thread.id}`)
    expect(after.status()).toBe(200)
    const detail = await after.json()
    expect(detail.data.posts.length, 'reply must appear in the posts list').toBeGreaterThan(1)
    const found = detail.data.posts.find((p: { body: string }) => p.body === replyText)
    expect(found, 'the reply text must be in the posts list').toBeTruthy()
    // post_count on the topic should have incremented.
    expect(detail.data.reply_count).toBeGreaterThanOrEqual(1)
  })

  test('rejecting a reply on a closed thread returns 403', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Soon-to-be-closed ${Date.now()}`,
      body: 'closing this',
      categoryId: category.id,
    })
    // Author can close their own thread via PUT (close-via-status), then
    // verify the alias reply route refuses to write to the closed thread.
    const close = await page.request.put(`${API_BASE}/topics/${thread.id}`, {
      data: { status: 'closed' },
    })
    expect(close.status()).toBeLessThan(400)
    // Now attempt to reply via the alias.
    const r = await page.request.post(`${API_BASE}/threads/${thread.id}/posts`, {
      data: { body: 'should be rejected' },
    })
    expect(r.status()).toBe(403)
  })
})
