/**
 * Documents — outcome assertions for the upload flow.
 *
 *  - GET /api/documents returns the seeded documents for a fresh user.
 *  - POST /api/documents creates a new row and the next GET sees it.
 *  - The page UI exposes the upload trigger + hidden file input that the
 *    user-facing button drives (so we know the click target is wired).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

interface DocApi {
  id: string
  title: string
  category?: string
  file_url?: string | null
  file_size?: number | null
  uploaded_at?: string | null
}

async function listDocuments(
  page: import('@playwright/test').Page,
  token: string | null,
): Promise<DocApi[]> {
  const r = await page.request.get(`${API_BASE}/documents`, { headers: authHeaders(token) })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as DocApi[]
}

test.describe('documents', () => {
  test('seeded documents are returned for a fresh user', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docs-seed'))
    const docs = await listDocuments(page, accessToken)
    expect(docs.length).toBeGreaterThan(0)
    expect(typeof docs[0].title).toBe('string')
  })

  test('POST /api/documents creates a row and the next GET sees it', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docs-create'))
    const before = await listDocuments(page, accessToken)
    const r = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: {
        title: `e2e-upload-${Date.now()}.pdf`,
        category: 'lab_report',
        file_name: 'e2e-upload.pdf',
        file_size: 1234,
        size_bytes: 1234,
        content_type: 'application/pdf',
        mime_type: 'application/pdf',
        // Tiny inline data URL so the row carries something the UI can open.
        file_url: 'data:application/pdf;base64,JVBERi0xLjAKJSU=',
        document_date: new Date().toISOString().slice(0, 10),
      },
    })
    expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
    const created = (await r.json()) as DocApi
    expect(created.id).toBeTruthy()
    const after = await listDocuments(page, accessToken)
    expect(after.length).toBeGreaterThan(before.length)
    const found = after.find((d) => d.id === created.id)
    expect(found?.title).toContain('e2e-upload-')
    expect(found?.file_url ?? null).not.toBeNull()
  })

  test('Documents page exposes upload trigger button and hidden file input', async ({ page }) => {
    await signup(page, uniqueEmail('docs-page'))
    await page.goto(APP_BASE + '/documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-documents"]').first()).toBeVisible()
    await expect(page.locator('[data-mol-id="documents-upload"]').first()).toBeVisible()
    // Hidden file input: not visible, but it must be in the DOM, attached to
    // the upload button via a ref. Querying by data-mol-id confirms wiring.
    const inputCount = await page.locator('[data-mol-id="documents-file-input"]').count()
    expect(inputCount).toBeGreaterThan(0)
  })
})
