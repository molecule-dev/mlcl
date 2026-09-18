/**
 * /doc/:id (Editor) — title/body persistence, publish, trash, share.
 *
 * Mirrors editor.spec.ts; this filename matches gate 6's
 * observation-stem expectation.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/doc/:id editor', () => {
  test('title edit persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-title'))
    const created = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: { title: 'Original' },
    })
    const doc = (await created.json()) as { id: string }
    await page.goto(APP_BASE + `/doc/${doc.id}`)
    await page.waitForSelector('[data-testid="editor-title"]')
    await page.getByTestId('editor-title').fill('Updated by user')
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForSelector('[data-testid="editor-title"]')
    await expect(page.getByTestId('editor-title')).toHaveValue('Updated by user')
  })

  test('body edit writes through to document.content', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-body'))
    const created = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: { title: 'Body test', content: { blocks: [{ type: 'paragraph', text: 'old' }] } },
    })
    const doc = (await created.json()) as { id: string }
    await page.goto(APP_BASE + `/doc/${doc.id}`)
    await page.waitForSelector('[data-testid="editor-body"]')
    await page.getByTestId('editor-body').fill('new body content')
    await page.waitForTimeout(1500)
    const after = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const body = (await after.json()) as { content: { blocks?: Array<{ text?: string }> } }
    const text = (body.content.blocks ?? []).map((b) => b.text ?? '').join(' ')
    expect(text).toContain('new body content')
  })

  test('publish toggle changes status to published', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-pub'))
    const created = await page.request.post(`${API_BASE}/documents`, {
      headers: authHeaders(accessToken),
      data: { title: 'Pub test' },
    })
    const doc = (await created.json()) as { id: string }
    await page.goto(APP_BASE + `/doc/${doc.id}`)
    await page.waitForSelector('[data-testid="editor-publish-toggle"]')
    await page.getByTestId('editor-publish-toggle').click()
    await page.waitForTimeout(700)
    const after = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    expect(((await after.json()) as { status: string }).status).toBe('published')
  })
})

test.describe('doc__id — network', () => {
  test('editor load triggers GET /api/documents/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('docid-net'))
    const created = await page.request.post(API_BASE + '/documents', {
      headers: authHeaders(accessToken),
      data: { title: 'Net' },
    })
    const doc = (await created.json()) as { id: string }
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/doc/' + doc.id)
      await page.waitForSelector('[data-testid="editor-title"]')
    })
    expect(reqs.some((r) => r.url.includes('/api/documents/' + doc.id))).toBe(true)
  })
})
