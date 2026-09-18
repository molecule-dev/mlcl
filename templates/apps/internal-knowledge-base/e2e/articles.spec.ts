import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, createArticle, createSpace, signup } from './_helpers.js'

test('ArticleEditor: create new draft via UI, POST /articles → reflected in GET', async ({
  page,
}) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  await page.goto(`${APP_BASE}/article/new/edit?space=${space.key}`)
  // Wait for spaces dropdown to load
  await page.waitForTimeout(500)
  await page
    .locator('input[aria-label*="Article title"], input[aria-label*="title"]')
    .first()
    .fill('My first article')
  await page.locator('textarea[data-editor-body]').fill('# Hello\n\nThis is the body.')

  let articleId: string | null = null
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /save draft/i }).click()
    // Wait for the URL to switch to the saved id
    await page.waitForURL(/\/article\/[0-9a-f-]{36}\/edit/, { timeout: 15_000 })
    const m = page.url().match(/\/article\/([0-9a-f-]{36})\/edit/)
    articleId = m?.[1] ?? null
  })

  const post = reqs.find((r) => /\/api\/articles$/.test(r.url) && r.method === 'POST')
  expect(post?.status).toBe(201)
  expect(articleId).toBeTruthy()

  // Backend GET reflects the article.
  const got = await apiGet<{ title: string; body_md: string; status: string }>(
    page,
    `/articles/${articleId}`,
  )
  expect(got.status).toBe(200)
  expect(got.body?.title).toBe('My first article')
  expect(got.body?.body_md).toContain('Hello')
  expect(got.body?.status).toBe('draft')
})

test('ArticleEditor: publish flips status; survives reload', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, { key: `prod-${Date.now().toString(36)}`, name: 'Product' })
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'Pre-publish',
    body_md: '# Pre',
    body_html: '<h1>Pre</h1>',
    status: 'draft',
  })

  await page.goto(`${APP_BASE}/article/${a.id}/edit`)
  await page.waitForTimeout(500)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /^publish$/i }).click()
    await page.waitForTimeout(1500)
  })
  const patch = reqs.find(
    (r) => new RegExp(`/api/articles/${a.id}$`).test(r.url) && r.method === 'PATCH',
  )
  expect(patch?.status).toBe(200)

  const got = await apiGet<{ status: string; published_at: string | null }>(
    page,
    `/articles/${a.id}`,
  )
  expect(got.body?.status).toBe('published')
  expect(got.body?.published_at).not.toBeNull()

  // After reload, status pill still says published.
  await page.reload()
  await page.waitForTimeout(500)
  await expect(page.getByText(/Published/i).first()).toBeVisible()
})

test('ArticleView renders article body via /articles/:id', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const uniqueBody = 'Pager rotates every Tuesday at noon Pacific.'
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'On-call rotation',
    body_md: `# Overview\n\nIntro paragraph.\n\n## Schedule\n\n${uniqueBody}`,
    body_html: `<h1>Overview</h1><p>Intro paragraph.</p><h2>Schedule</h2><p>${uniqueBody}</p>`,
    status: 'published',
  })
  await page.goto(`${APP_BASE}/article/${a.id}`)
  await expect(page.locator('h1', { hasText: 'On-call rotation' })).toBeVisible({ timeout: 10_000 })
  // Body content rendered via dangerouslySetInnerHTML must contain unique paragraph
  await expect(page.getByText(uniqueBody)).toBeVisible()
})

test('Article PATCH writes a version row that /article-versions/:id returns', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'Versioned',
    body_md: '# v1',
    body_html: '<h1>v1</h1>',
    status: 'draft',
  })
  // Edit the body
  await page.goto(`${APP_BASE}/article/${a.id}/edit`)
  await page.waitForTimeout(500)
  await page.locator('textarea[data-editor-body]').fill('# v2\n\nNew content.')
  await page.getByRole('button', { name: /save draft/i }).click()
  await page.waitForTimeout(1000)

  const versions = await apiGet<Array<{ body_md: string }>>(page, `/article-versions/${a.id}`)
  expect(versions.status).toBe(200)
  expect(Array.isArray(versions.body)).toBe(true)
  expect((versions.body as Array<{ body_md: string }>).length).toBeGreaterThanOrEqual(1)
  // First entry is the previous body (the v1 content prior to edit)
  const v0 = (versions.body as Array<{ body_md: string }>)[0]
  expect(v0.body_md).toContain('v1')
})

test("Cannot read another user's article (authz)", async ({ page, browser }) => {
  const ctxA = await browser.newContext()
  const pA = await ctxA.newPage()
  await signup(pA)
  const spA = await createSpace(pA, { key: `pa-${Date.now().toString(36)}`, name: 'Private A' })
  const aA = await createArticle(pA, {
    space_id: spA.id,
    title: 'Secret',
    body_md: 'shh',
    body_html: '<p>shh</p>',
    status: 'published',
  })
  await ctxA.close()

  await signup(page)
  const r = await apiGet(page, `/articles/${aA.id}`)
  expect(r.status).toBe(404)
})
