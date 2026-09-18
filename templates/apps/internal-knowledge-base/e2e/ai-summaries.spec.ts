/**
 * AI summary cache — exercise the /api/ai-summaries handler. Reads are
 * gated by article read access; writes by article write access.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  apiDelete,
  apiGet,
  apiPost,
  createArticle,
  createSpace,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('POST /api/ai-summaries caches a summary; GET /api/ai-summaries/:id returns it', async ({
  page,
}) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const article = await createArticle(page, {
    space_id: space.id,
    title: 'Runbook: deploy pipeline',
    body_md: '# Deploy pipeline\nSteps: build, test, ship.',
    body_html: '<h1>Deploy pipeline</h1>',
    status: 'published',
  })

  const summary_md = 'Deploy pipeline runs build → test → ship.'
  const created = await apiPost<{
    id: string
    article_id: string
    summary_md: string
    model: string
  }>(page, '/ai-summaries', { article_id: article.id, summary_md, model: 'test-cache' })
  expect(created.status).toBe(201)
  expect(created.body?.article_id).toBe(article.id)
  expect(created.body?.summary_md).toBe(summary_md)

  // GET by article id returns the cached summary
  const got = await apiGet<{ summary_md: string; model: string; generated_at: string }>(
    page,
    `/ai-summaries/${article.id}`,
  )
  expect(got.status).toBe(200)
  expect(got.body?.summary_md).toBe(summary_md)
  expect(got.body?.model).toBe('test-cache')
})

test('POST /api/ai-summaries upserts on the same article (no duplicate row)', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const article = await createArticle(page, {
    space_id: space.id,
    title: 'Versioned summary',
    body_md: 'v1',
    body_html: '<p>v1</p>',
    status: 'draft',
  })

  const first = await apiPost<{ id: string }>(page, '/ai-summaries', {
    article_id: article.id,
    summary_md: 'v1 summary',
  })
  expect(first.status).toBe(201)
  const firstId = first.body?.id

  const second = await apiPost<{ id: string; summary_md: string }>(page, '/ai-summaries', {
    article_id: article.id,
    summary_md: 'v2 summary',
  })
  // Upsert returns 200 with the same id and updated summary text
  expect([200, 201]).toContain(second.status)
  expect(second.body?.id).toBe(firstId)
  expect(second.body?.summary_md).toBe('v2 summary')

  const got = await apiGet<{ summary_md: string }>(page, `/ai-summaries/${article.id}`)
  expect(got.body?.summary_md).toBe('v2 summary')
})

test('DELETE /api/ai-summaries/:articleId clears the cached summary', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const article = await createArticle(page, {
    space_id: space.id,
    title: 'To clear',
    body_md: 'body',
    body_html: '<p>body</p>',
    status: 'draft',
  })
  await apiPost(page, '/ai-summaries', { article_id: article.id, summary_md: 'temp' })

  const del = await apiDelete(page, `/ai-summaries/${article.id}`)
  expect(del).toBe(204)

  const got = await apiGet(page, `/ai-summaries/${article.id}`)
  expect(got.status).toBe(404)
})

test("Cannot read another user's ai-summary cache (authz)", async ({ page, browser }) => {
  // User A creates space + article + summary
  const ctxA = await browser.newContext()
  const pA = await ctxA.newPage()
  await signup(pA, uniqueEmail('userA'))
  const spA = await createSpace(pA, { key: `pa-${Date.now().toString(36)}`, name: 'Private A' })
  const aA = await createArticle(pA, {
    space_id: spA.id,
    title: 'Secret',
    body_md: 'x',
    body_html: '<p>x</p>',
    status: 'draft',
  })
  await apiPost(pA, '/ai-summaries', { article_id: aA.id, summary_md: 'private summary' })
  await ctxA.close()

  // User B should get 404 (article not readable)
  await signup(page, uniqueEmail('userB'))
  const r = await apiGet(page, `/ai-summaries/${aA.id}`)
  expect(r.status).toBe(404)
})
