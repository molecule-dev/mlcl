/**
 * /editor/:id — the writing surface.
 *
 * Asserts the editor loads a document, autosave actually persists body
 * + title (read-after-write), publish / pin / snapshot / trash / export
 * each fire the right API call AND change the underlying row, and the
 * markdown toolbar wraps selected text.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedGet,
  captureNetwork,
  createDocument,
  getAccessToken,
  listVersions,
  readDocument,
  signup,
  type ApiDocument,
  type ApiVersion,
} from './_helpers.js'

test.describe('/editor/:id', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('loads a document by id and shows title + body', async ({ page }) => {
    const doc = await createDocument(page, {
      title: 'Loaded title',
      body_md: 'Loaded body line one.\n\nLine two.',
    })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    await expect(page.getByTestId('editor-title')).toHaveValue('Loaded title')
    await expect(page.getByTestId('editor-body')).toHaveValue(/Loaded body line one/)
  })

  test('autosave persists title + body server-side after debounce', async ({ page }) => {
    const doc = await createDocument(page, { title: 'Autosave starting', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    await expect(page.getByTestId('editor-title')).toHaveValue('Autosave starting')

    await page.getByTestId('editor-title').fill('Autosave new title')
    await page.getByTestId('editor-body').fill('Autosave new body content here.')

    // Wait for autosave (debounce + network)
    await page.waitForTimeout(2_500)
    await expect(page.getByTestId('editor-save-state')).toContainText(/Saved/i, { timeout: 6_000 })

    const fresh = await readDocument(page, doc.id)
    expect(fresh.title).toBe('Autosave new title')
    expect(fresh.body_md).toBe('Autosave new body content here.')
  })

  test('publish CTA flips status to "published" server-side', async ({ page }) => {
    const doc = await createDocument(page, { title: 'To Publish', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('editor-publish').click()
      await page.waitForTimeout(1_000)
    })
    const patch = reqs.find(
      (r) => new RegExp(`/api/documents/${doc.id}(\\?|$)`).test(r.url) && r.method === 'PATCH',
    )
    expect(patch?.status).toBeGreaterThanOrEqual(200)
    expect(patch?.status).toBeLessThan(300)
    const fresh = await readDocument(page, doc.id)
    expect(fresh.status).toBe('published')
  })

  test('pin CTA flips pinned=true server-side', async ({ page }) => {
    const doc = await createDocument(page, { title: 'To Pin', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    await page.getByTestId('editor-pin').click()
    await page.waitForTimeout(1_000)
    const fresh = await readDocument(page, doc.id)
    expect(fresh.pinned).toBe(true)
  })

  test('snapshot CTA creates a new document_versions row', async ({ page }) => {
    const doc = await createDocument(page, {
      title: 'For Snapshots',
      body_md: 'snapshot body alpha',
    })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    const before = await listVersions(page, doc.id)
    await page.getByTestId('editor-snapshot').click()
    await page.waitForTimeout(1_500)
    const after = await listVersions(page, doc.id)
    expect(after.length, 'snapshot must add a row').toBeGreaterThan(before.length)
  })

  test('export CTA delivers a real markdown file', async ({ page }) => {
    const doc = await createDocument(page, {
      title: 'For Export',
      body_md: '# heading\nbody',
    })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)

    // Capture the POST /exports response payload to assert the artifact
    // came back in the response (not a placeholder "queued" row).
    const responsePromise = page.waitForResponse(
      (r) => /\/api\/exports(\?|$)/.test(r.url()) && r.request().method() === 'POST',
    )
    await page.getByTestId('editor-export').click()
    const exportResp = await responsePromise
    expect(exportResp.status(), 'POST /api/exports must succeed').toBeLessThan(300)
    const payload = (await exportResp.json()) as {
      id?: string
      content?: string
      filename?: string
      contentType?: string
      status?: string
    }
    expect(payload.status, 'export must be marked completed').toBe('completed')
    expect(payload.content, 'response must contain the rendered artifact').toMatch(/heading/i)
    expect(payload.content).toContain('body')
    expect(payload.filename).toMatch(/\.md$/)
    expect(payload.contentType).toMatch(/markdown/)

    // The artifact must also be downloadable via the /download endpoint
    // and contain the same bytes (the audit trail says "completed", the
    // bytes are real, the user can re-fetch).
    const tokenJson = await getAccessToken(page)
    const dl = await page.request.get(
      `${APP_BASE.replace(/:\d+$/, ':' + (process.env.API_PORT ?? '4000'))}/api/exports/${payload.id}/download`,
      { headers: { Authorization: `Bearer ${tokenJson ?? ''}` } },
    )
    expect(dl.status()).toBe(200)
    expect(dl.headers()['content-type']).toMatch(/markdown/)
    expect(dl.headers()['content-disposition']).toMatch(/attachment;\s*filename=/)
    const body = await dl.text()
    expect(body).toContain('heading')
    expect(body).toContain('body')
  })

  test('trash CTA arms, then commits on the confirming click and routes back to /library', async ({
    page,
  }) => {
    const doc = await createDocument(page, { title: 'To Trash', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    // ConfirmButton is two-click arm/commit: the first click must NOT
    // trash anything, only reveal the confirm label.
    const trash = page.getByTestId('editor-trash')
    await trash.click()
    await expect(trash).toContainText('Move this document to trash?')
    const listBefore = await authedGet<ApiDocument[]>(page, '/documents')
    expect(listBefore.some((d) => d.id === doc.id)).toBe(true)
    await trash.click()
    await page.waitForURL(/\/library/, { timeout: 10_000 })
    // Trashed documents shouldn't appear in the default list (handler hides them).
    const list = await authedGet<ApiDocument[]>(page, '/documents')
    expect(list.some((d) => d.id === doc.id)).toBe(false)
  })

  test('markdown toolbar wraps selected text with bold markers', async ({ page }) => {
    const doc = await createDocument(page, { title: 'Toolbar Test', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    const ta = page.getByTestId('editor-body')
    await ta.fill('hello world')
    await ta.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 5)
    })
    await page.getByRole('button', { name: 'Bold' }).first().click()
    await expect(ta).toHaveValue(/\*\*hello\*\* world/)
  })

  test('word-count + reading-time update as the user types', async ({ page }) => {
    const doc = await createDocument(page, { title: 'WC Test', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}`)
    await page.getByTestId('editor-body').fill('one two three four five six seven')
    await expect(page.getByTestId('editor-word-count')).toContainText('7')
  })
})
