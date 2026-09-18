import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiAs,
  captureNetwork,
  createThread,
  pickCategory,
  signup,
  signupApi,
} from './_helpers.js'

test.describe('/t/:id (ThreadView)', () => {
  test('Breadcrumb "Categories" navigates to /c', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Breadcrumb test ${Date.now()}`,
      body: 'breadcrumb',
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/t/${thread.id}`)
    await page
      .getByRole('navigation')
      .getByRole('link', { name: /Categories/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
  })

  test('Breadcrumb category-name link navigates to /c/:slug', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Cat-link breadcrumb ${Date.now()}`,
      body: 'cat-link',
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/t/${thread.id}`)
    await page.getByRole('navigation').getByRole('link', { name: category.name }).first().click()
    await expect(page).toHaveURL(new RegExp(`/c/${category.slug}$`), { timeout: 10_000 })
  })

  test('Original post body renders from /api/threads/:id', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const body = `original-post-body-${Date.now()}`
    const thread = await createThread(page, {
      title: `OP-body test ${Date.now()}`,
      body,
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/t/${thread.id}`)
    await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 })
  })

  test('Reply textarea accepts typed input', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Reply input test ${Date.now()}`,
      body: 'reply',
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/t/${thread.id}`)
    const ta = page.locator('#thread-reply')
    await ta.fill('My reply text')
    await expect(ta).toHaveValue('My reply text')
  })

  test('Post-reply submit POSTs /api/threads/:id/posts and the new reply appears (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Reply round-trip ${Date.now()}`,
      body: 'starter',
      categoryId: category.id,
    })
    const reply = `reply-text-${Date.now()}`
    await page.goto(APP_BASE + `/t/${thread.id}`)
    await page.locator('#thread-reply').fill(reply)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Post reply$/i }).click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find(
      (r) => /\/api\/threads\/[^/]+\/posts$/.test(r.url) && r.method === 'POST',
    )
    expect(post, 'POST /api/threads/:id/posts must have fired').toBeTruthy()
    expect(post!.status).toBeLessThan(400)

    // Read-after-write: GET reflects the new reply
    const detail = await page.request.get(API_BASE + `/threads/${thread.id}`)
    const data = (await detail.json()).data
    const found = data.posts.find((p: { body: string }) => p.body === reply)
    expect(found, 'GET /api/threads/:id must include the new reply').toBeTruthy()
  })

  test('Bookmark toggle: aria-pressed flips, persists across reload', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Bookmark persistence ${Date.now()}`,
      body: 'pin me',
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/t/${thread.id}`)
    const btn = page.getByRole('button', { name: /Bookmark thread|Remove bookmark/i }).first()
    await expect(btn).toBeVisible({ timeout: 15_000 })
    const before = await btn.getAttribute('aria-pressed')
    const reqs = await captureNetwork(page, async () => {
      await btn.click()
      await page.waitForTimeout(1200)
    })
    const bk = reqs.find(
      (r) =>
        /\/api\/threads\/[^/]+\/bookmark$/.test(r.url) &&
        (r.method === 'POST' || r.method === 'DELETE'),
    )
    expect(bk, 'bookmark POST/DELETE must fire').toBeTruthy()
    expect(bk!.status).toBeLessThan(400)
    const after = await btn.getAttribute('aria-pressed')
    expect(after).not.toBe(before)

    await page.reload()
    const persisted = page.getByRole('button', { name: /Bookmark thread|Remove bookmark/i }).first()
    await expect(persisted).toBeVisible({ timeout: 15_000 })
    const persistedState = await persisted.getAttribute('aria-pressed')
    expect(persistedState).toBe(after)
  })

  test('Author username link navigates to /u/:username', async ({ page }) => {
    const author = await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Author link ${Date.now()}`,
      body: 'mine',
      categoryId: category.id,
    })
    await page.goto(APP_BASE + `/t/${thread.id}`)
    // The author link contains '@<username>' in text — but we don't know the auto-generated username.
    // Find the first link inside the thread header that goes to /u/...
    const link = page.locator('a[href^="/u/"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })
    await link.click()
    await expect(page).toHaveURL(/\/u\/[^/]+$/, { timeout: 10_000 })
    expect(author.userId).toBeTruthy()
  })

  test('Closed thread shows the locked banner and posting via API returns 403', async ({
    page,
  }) => {
    const author = await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Locked-thread test ${Date.now()}`,
      body: 'starter',
      categoryId: category.id,
    })
    // Close the thread as the author
    const close = await apiAs(
      page,
      author.accessToken,
      'POST',
      `${API_BASE}/threads/${thread.id}/close`,
    )
    expect(close.status()).toBeLessThan(400)

    await page.goto(APP_BASE + `/t/${thread.id}`)
    await expect(page.getByText(/This thread is locked/i)).toBeVisible({ timeout: 15_000 })

    // Attempting to reply via the API should 403 for the second user
    const other = await signupApi(page)
    const reply = await apiAs(
      page,
      other.accessToken,
      'POST',
      `${API_BASE}/threads/${thread.id}/posts`,
      { body: 'should be rejected' },
    )
    expect(reply.status()).toBe(403)
  })
})
