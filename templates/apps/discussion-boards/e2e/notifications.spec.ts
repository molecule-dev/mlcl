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

test.describe('notifications', () => {
  test('GET /notifications returns a data array shape (may be empty)', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(`${API_BASE}/notifications`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('GET /notifications/unread-count returns a numeric count', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(`${API_BASE}/notifications/unread-count`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.count).toBe('number')
  })

  test('Notifications page heading renders without raw {{count}} placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
    const text = await heading.innerText()
    expect(text).not.toMatch(/\{\{count/i)
  })

  test('Filter chip "All" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const chip = page.getByRole('button', { name: /^All$/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "Unread" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const chip = page.getByRole('button', { name: /^Unread$/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Mark-all-read button is present (disabled when 0 unread)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const btn = page.getByRole('button', { name: /Mark all read/i })
    await expect(btn).toBeVisible({ timeout: 15_000 })
  })

  test('Empty state renders for a fresh user with no notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/caught up|all caught up|no notifications/i)).toBeVisible({
      timeout: 15_000,
    })
  })

  test('A reply from another user creates a notification activity for the thread author', async ({
    page,
  }) => {
    const author = await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Notifications probe ${Date.now()}`,
      body: 'starter',
      categoryId: category.id,
    })
    const other = await signupApi(page)
    const reply = await apiAs(
      page,
      other.accessToken,
      'POST',
      `${API_BASE}/threads/${thread.id}/posts`,
      { body: 'real reply from another user' },
    )
    expect(reply.status()).toBeLessThan(400)

    const list = await apiAs(page, author.accessToken, 'GET', `${API_BASE}/notifications`)
    expect(list.status()).toBe(200)
    const data = (await list.json()).data ?? []
    const found = data.find((n: { thread?: { id?: string } }) => n.thread?.id === thread.id)
    expect(found, 'notification for the new reply must appear').toBeTruthy()
    expect(author.userId).toBeTruthy()
  })

  test('Mark-all-read flips unread-count to zero (read-after-write)', async ({ page }) => {
    const author = await signup(page)
    const category = await pickCategory(page)
    const thread = await createThread(page, {
      title: `Mark-all-read probe ${Date.now()}`,
      body: 'x',
      categoryId: category.id,
    })
    const other = await signupApi(page)
    await apiAs(page, other.accessToken, 'POST', `${API_BASE}/threads/${thread.id}/posts`, {
      body: 'reply from other',
    })

    const post = await apiAs(
      page,
      author.accessToken,
      'POST',
      `${API_BASE}/notifications/mark-all-read`,
    )
    expect(post.status()).toBeLessThan(400)

    const after = await apiAs(
      page,
      author.accessToken,
      'GET',
      `${API_BASE}/notifications/unread-count`,
    )
    const count = (await after.json()).count
    expect(count).toBe(0)
  })

  test('Notifications page calls GET /api/notifications on load (captureNetwork invariant)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForTimeout(1500)
    })
    const list = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/notifications must fire on Notifications page load').toBeTruthy()
    expect(list!.status).toBe(200)
  })

  test('Notifications page is reachable for authenticated users', async ({ page }) => {
    await signup(page)
    const res = await page.goto(APP_BASE + '/notifications')
    expect(res?.status()).toBeLessThan(500)
  })
})
