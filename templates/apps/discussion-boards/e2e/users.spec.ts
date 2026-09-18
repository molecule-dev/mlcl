import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, createThread, pickCategory, signup } from './_helpers.js'

test.describe('user profile', () => {
  test('GET /users/by-username/:username returns the real user with their threads', async ({
    page,
  }) => {
    const { name } = await signup(page)
    const category = await pickCategory(page)
    const t1 = await createThread(page, {
      title: `Profile thread A ${Date.now()}`,
      body: 'a',
      categoryId: category.id,
    })
    const t2 = await createThread(page, {
      title: `Profile thread B ${Date.now()}`,
      body: 'b',
      categoryId: category.id,
    })

    const res = await page.request.get(`${API_BASE}/users/by-username/${encodeURIComponent(name)}`)
    expect(res.status()).toBe(200)
    const profile = (await res.json()).data
    expect(profile.username).toBe(name)
    expect(profile.thread_count).toBeGreaterThanOrEqual(2)
    const titles = profile.recent_threads.map((t: { title: string }) => t.title)
    expect(titles).toContain(t1.title)
    expect(titles).toContain(t2.title)
  })

  test('UserProfile page renders the real user (not Helena placeholder)', async ({ page }) => {
    const { name } = await signup(page)
    await page.goto(APP_BASE + '/u/' + encodeURIComponent(name))
    // Assert the page heading shows the live user name (not a hardcoded placeholder).
    await expect(page.getByRole('heading', { name }).first()).toBeVisible({ timeout: 15_000 })
  })

  test('GET /users/by-username/:username 404s for a non-existent user', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(`${API_BASE}/users/by-username/nobodyhere${Date.now()}`)
    expect(res.status()).toBe(404)
  })
})
