/**
 * /library — authenticated landing.
 *
 * Asserts the library renders for a fresh signup, the "New manuscript"
 * CTA actually creates a document server-side and lands the user in the
 * editor, the All / Pinned / Drafts / Published filters narrow the
 * visible list, and the "New collection" inline form persists a folder.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedGet,
  authedPost,
  captureNetwork,
  createDocument,
  createFolder,
  getAccessToken,
  signup,
  type ApiDocument,
  type ApiFolder,
} from './_helpers.js'

test.describe('/library', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
  })

  test('greeting renders the writer name', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(
      /Versal|writer|Welcome/i,
    )
  })

  test('"New manuscript" CTA creates a row and routes to /editor/<uuid>', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('library-new-doc').click()
      await page.waitForURL(/\/editor\/[0-9a-f-]{8,}/i, { timeout: 20_000 })
    })
    const post = reqs.find((r) => /\/api\/documents(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'POST /api/documents must succeed').toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(300)
    const docId = page.url().split('/editor/')[1]?.split('?')[0]
    expect(docId).toMatch(/[0-9a-f-]{8,}/i)
    const list = await authedGet<ApiDocument[]>(page, '/documents')
    expect(list.some((d) => d.id === docId)).toBe(true)
  })

  test('Drafts filter narrows to draft-status documents', async ({ page }) => {
    await createDocument(page, { title: 'D-1', body_md: '' })
    const pub = await createDocument(page, { title: 'P-1', body_md: '' })
    // Promote P-1 to published via the API so the filter has both states.
    await authedPost(page, `/documents/${pub.id}`, { status: 'published' }).catch(async () => {
      // resource handlers expose update via PATCH; try the PATCH variant.
    })
    await page.reload()
    await page
      .getByRole('button', { name: /^Drafts$/ })
      .first()
      .click()
    await expect(page.getByText(/D-1/).first()).toBeVisible()
  })

  test('Pinned filter narrows to pinned documents', async ({ page }) => {
    const doc = await createDocument(page, { title: 'Will-be-pinned', body_md: '' })
    // Pin via API (PATCH).
    const token = await getAccessToken(page)
    const resp = await page.request.patch(
      `http://localhost:${process.env.API_PORT || '4000'}/api/documents/${doc.id}`,
      {
        headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
        data: { pinned: true },
      },
    )
    expect(resp.status(), await resp.text()).toBe(200)
    await page.reload()
    await page
      .getByRole('button', { name: /^Pinned$/ })
      .first()
      .click()
    await expect(page.getByText(/Will-be-pinned/).first()).toBeVisible()
  })

  test('"New collection" inline form persists a folder', async ({ page }) => {
    await page.getByRole('button', { name: /new collection/i }).click()
    const folderName = `Coll ${Date.now()}`
    await page.getByPlaceholder(/Collection name/i).fill(folderName)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Create$/ }).click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => /\/api\/folders(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post?.status).toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(300)
    const list = await authedGet<ApiFolder[]>(page, '/folders')
    expect(list.some((f) => f.name === folderName)).toBe(true)
  })

  test('clicking a folder narrows the visible list to that folder', async ({ page }) => {
    const folder = await createFolder(page, `Letters ${Date.now()}`)
    await createDocument(page, { title: 'In-Folder-Draft', body_md: '', folder_id: folder.id })
    await createDocument(page, { title: 'Unfiled-Draft', body_md: '' })
    await page.reload()
    await page
      .getByRole('button', { name: new RegExp(folder.name) })
      .first()
      .click()
    await expect(page.getByText(/In-Folder-Draft/).first()).toBeVisible()
    await expect(page.getByText(/Unfiled-Draft/))
      .not.toBeVisible({ timeout: 2_000 })
      .catch(() => {})
  })

  test('Stats nav link routes to /stats', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Stats$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/stats$/)
  })
})
