import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiGet,
  apiPost,
  captureNetwork,
  createArticle,
  createSpace,
  signup,
} from './_helpers.js'

test('Bookmarks empty state for fresh user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/bookmarks')
  await expect(page.getByText(/No bookmarks yet/i)).toBeVisible({ timeout: 10_000 })
})

test('Bookmark toggle on ArticleView creates a bookmark; appears on /bookmarks', async ({
  page,
}) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'Save me',
    body_md: '# A',
    body_html: '<h1>A</h1>',
    status: 'published',
  })
  await page.goto(`${APP_BASE}/article/${a.id}`)
  await page.waitForTimeout(500)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /^Bookmark$/i }).click()
    await page.waitForTimeout(800)
  })
  const post = reqs.find((r) => /\/api\/bookmarks(\?|$)/.test(r.url) && r.method === 'POST')
  expect(post?.status).toBe(201)

  // Reload — bookmark state persists
  await page.reload()
  await page.waitForTimeout(800)
  await expect(page.getByRole('button', { name: /Bookmarked/i })).toBeVisible()

  // Bookmarks page lists it
  await page.goto(APP_BASE + '/bookmarks')
  await expect(page.getByText('Save me')).toBeVisible({ timeout: 10_000 })
})

test('Removing bookmark from /bookmarks deletes it on the backend', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'Remove me',
    body_md: '# B',
    body_html: '<h1>B</h1>',
    status: 'published',
  })
  // Add bookmark via API
  const r = await apiPost(page, '/bookmarks', { resourceType: 'article', resourceId: a.id })
  expect(r.status).toBe(201)

  await page.goto(APP_BASE + '/bookmarks')
  await expect(page.getByText('Remove me')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /Remove bookmark/i }).click()
  await page.waitForTimeout(800)
  await expect(page.getByText('Remove me')).not.toBeVisible()

  // GET /bookmarks confirms it's gone
  const list = await apiGet<{ data?: unknown[] } | unknown[]>(page, '/bookmarks')
  expect(list.status).toBe(200)
  const arr = Array.isArray(list.body)
    ? list.body
    : ((list.body as { data?: unknown[] })?.data ?? [])
  expect(arr.length).toBe(0)
})
