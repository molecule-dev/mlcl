/**
 * Attachment metadata — exercise the /api/attachments handler. The blob
 * upload itself goes to S3 via the @molecule/api-uploads-s3 bond; this
 * handler tracks the metadata row and authzs against the parent
 * article's writability.
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

test('POST /api/attachments creates metadata for a writable article', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const article = await createArticle(page, {
    space_id: space.id,
    title: 'With attachment',
    body_md: '# A',
    body_html: '<h1>A</h1>',
    status: 'draft',
  })
  const r = await apiPost<{ id: string; article_id: string; filename: string; s3_key: string }>(
    page,
    '/attachments',
    {
      article_id: article.id,
      s3_key: `attachments/${article.id}/runbook.pdf`,
      filename: 'runbook.pdf',
      content_type: 'application/pdf',
      size_bytes: 51_234,
    },
  )
  expect(r.status).toBe(201)
  expect(r.body?.article_id).toBe(article.id)
  expect(r.body?.filename).toBe('runbook.pdf')
})

test('GET /api/attachments?article_id= lists metadata rows for the article', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const article = await createArticle(page, {
    space_id: space.id,
    title: 'Multi-file',
    body_md: '# A',
    body_html: '<h1>A</h1>',
    status: 'draft',
  })
  await apiPost(page, '/attachments', {
    article_id: article.id,
    s3_key: `attachments/${article.id}/a.pdf`,
    filename: 'a.pdf',
    content_type: 'application/pdf',
    size_bytes: 1000,
  })
  await apiPost(page, '/attachments', {
    article_id: article.id,
    s3_key: `attachments/${article.id}/b.png`,
    filename: 'b.png',
    content_type: 'image/png',
    size_bytes: 2000,
  })

  const list = await apiGet<Array<{ filename: string; article_id: string }>>(
    page,
    `/attachments?article_id=${article.id}`,
  )
  expect(list.status).toBe(200)
  expect(Array.isArray(list.body)).toBe(true)
  const items = list.body as Array<{ filename: string; article_id: string }>
  expect(items.length).toBe(2)
  expect(items.every((a) => a.article_id === article.id)).toBe(true)
  expect(items.map((a) => a.filename).sort()).toEqual(['a.pdf', 'b.png'])
})

test('DELETE /api/attachments/:id removes the row; subsequent GET no longer lists it', async ({
  page,
}) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const article = await createArticle(page, {
    space_id: space.id,
    title: 'To trim',
    body_md: '# A',
    body_html: '<h1>A</h1>',
    status: 'draft',
  })
  const created = await apiPost<{ id: string }>(page, '/attachments', {
    article_id: article.id,
    s3_key: `attachments/${article.id}/x.pdf`,
    filename: 'x.pdf',
    content_type: 'application/pdf',
    size_bytes: 10,
  })
  expect(created.status).toBe(201)
  const id = created.body?.id ?? ''

  const del = await apiDelete(page, `/attachments/${id}`)
  expect(del).toBe(204)

  const list = await apiGet<Array<{ id: string }>>(page, `/attachments?article_id=${article.id}`)
  expect(list.status).toBe(200)
  const arr = (list.body as Array<{ id: string }>) ?? []
  expect(arr.find((r) => r.id === id)).toBeUndefined()
})

test("Attachment list for an article in another user's space is empty (authz)", async ({
  page,
  browser,
}) => {
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
  await apiPost(pA, '/attachments', {
    article_id: aA.id,
    s3_key: `attachments/${aA.id}/secret.pdf`,
    filename: 'secret.pdf',
    content_type: 'application/pdf',
    size_bytes: 1,
  })
  await ctxA.close()

  await signup(page, uniqueEmail('userB'))
  const list = await apiGet<unknown[]>(page, `/attachments?article_id=${aA.id}`)
  // Handler returns [] for unreadable articles (does not 404)
  expect(list.status).toBe(200)
  expect(Array.isArray(list.body) ? (list.body as unknown[]).length : -1).toBe(0)
})
