/**
 * Editor — title + body autosave + visibility toggle + trash.
 *
 * Outcome assertions:
 * - Typing in the title or body persists via PUT /api/documents/:id
 *   and survives page.reload().
 * - "Move to trash" sets `trashed_at` and the doc disappears from
 *   /api/documents but appears in /api/documents/trash.
 * - Publish toggle flips `status` and survives reload.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('editor', () => {
  test('title edit persists across reload (PUT /api/documents)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ed-title'))
    const created = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: { title: 'Original' },
    })
    expect(created.status()).toBe(201)
    const doc = (await created.json()) as { id: string }

    await page.goto(APP_BASE + `/doc/${doc.id}`)
    await page.waitForSelector('[data-testid="editor-title"]')
    await page.getByTestId('editor-title').fill('Updated by user')
    // Debounced autosave fires after 800ms.
    await page.waitForTimeout(1500)
    // Assert the API row now carries the new title.
    const after = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { title: string }
    expect(afterBody.title).toBe('Updated by user')

    // Reload the editor and verify the title reads back from the server.
    await page.reload()
    await page.waitForSelector('[data-testid="editor-title"]')
    await expect(page.getByTestId('editor-title')).toHaveValue('Updated by user')
  })

  test('body edit persists into document.content blocks', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ed-body'))
    const created = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: { title: 'Body Test' },
    })
    const doc = (await created.json()) as { id: string }

    await page.goto(APP_BASE + `/doc/${doc.id}`)
    await page.waitForSelector('[data-testid="editor-body"]')
    const sentinel = `Walker sentinel ${Date.now()}`
    await page.getByTestId('editor-body').fill(`Heading line\n\n${sentinel}`)
    await page.waitForTimeout(1500)
    const after = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const afterBody = (await after.json()) as {
      content: { blocks?: Array<{ text: string }> }
    }
    const allText = (afterBody.content.blocks ?? []).map((b) => b.text).join('|')
    expect(allText, 'sentinel text should be in the saved blocks').toContain(sentinel)

    await page.reload()
    await page.waitForSelector('[data-testid="editor-body"]')
    await expect(page.getByTestId('editor-body')).toHaveValue(new RegExp(sentinel))
  })

  test('publish toggle changes document.status and survives reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ed-publish'))
    const created = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: { title: 'Publish Test' },
    })
    const doc = (await created.json()) as { id: string; status: string }
    expect(doc.status).toBe('draft')

    await page.goto(APP_BASE + `/doc/${doc.id}`)
    await page.waitForSelector('[data-testid="editor-publish-toggle"]')
    await page.getByTestId('editor-publish-toggle').click()
    await page.waitForTimeout(700)

    const after = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { status: string }
    expect(afterBody.status).toBe('published')

    await page.reload()
    await page.waitForSelector('[data-testid="editor-publish-toggle"]')
    await expect(page.getByTestId('editor-publish-toggle')).toContainText(/unpublish/i)
  })

  test('Move to trash sets trashed_at + doc disappears from /api/documents', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ed-trash'))
    const created = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: { title: 'Trash Me' },
    })
    const doc = (await created.json()) as { id: string }

    await page.goto(APP_BASE + `/doc/${doc.id}`)
    await page.waitForSelector('[data-testid="editor-trash"]')
    await page.getByTestId('editor-trash').click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    const list = await page.request.get(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ id: string }>
    expect(items.find((d) => d.id === doc.id)).toBeUndefined()

    const trash = await page.request.get(`${API_BASE}/documents/trash`, {
      headers: authHeaders(accessToken),
    })
    const trashed = (await trash.json()) as Array<{ id: string }>
    expect(
      trashed.find((d) => d.id === doc.id),
      'doc should be in trash',
    ).toBeTruthy()
  })

  test('"/doc/new" creates a new doc and navigates to its id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ed-new'))
    await page.goto(APP_BASE + '/doc/new')
    await page.waitForURL(/\/doc\/[0-9a-f-]{36}/, { timeout: 10000 })
    const id = page.url().split('/doc/')[1]!.split('/')[0]!
    const resp = await page.request.get(`${API_BASE}/documents/${id}`, {
      headers: authHeaders(accessToken),
    })
    expect(resp.status()).toBe(200)
    const body = (await resp.json()) as { id: string }
    expect(body.id).toBe(id)
  })
})
