import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiDelete, apiGet, createArticle, createSpace, signup } from './_helpers.js'

test('DELETE /articles/:id removes the article; subsequent GET returns 404', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  const a = await createArticle(page, {
    space_id: sp.id,
    title: 'Doomed',
    body_md: 'gone',
    body_html: '<p>gone</p>',
    status: 'draft',
  })
  const status = await apiDelete(page, `/articles/${a.id}`)
  expect([200, 204]).toContain(status)
  const r = await apiGet(page, `/articles/${a.id}`)
  expect(r.status).toBe(404)
})

test("Cannot delete another user's article (authz)", async ({ page, browser }) => {
  const ctxA = await browser.newContext()
  const pA = await ctxA.newPage()
  await signup(pA)
  const sp = await createSpace(pA, { key: `pa-${Date.now().toString(36)}`, name: 'Private' })
  const a = await createArticle(pA, {
    space_id: sp.id,
    title: 'Mine',
    body_md: 'hi',
    body_html: '<p>hi</p>',
    status: 'draft',
  })
  await ctxA.close()

  await signup(page)
  const status = await apiDelete(page, `/articles/${a.id}`)
  expect(status).toBe(404)
})
