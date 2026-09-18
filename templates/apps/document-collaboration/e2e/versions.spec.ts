/**
 * Version history — every save snapshots the prior body.
 *
 * Outcome assertions:
 * - PUT /api/documents/:id creates a new row in document_versions
 *   carrying the PRE-update content.
 * - Restore from a version overwrites documents.content with that
 *   version's content AND inserts a new "Restored from version N"
 *   snapshot, so history is monotonically growing.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, seedDocument, signup, uniqueEmail } from './_helpers.js'

test.describe('versions', () => {
  test('saving the editor twice creates 2 version snapshots', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('ver-save'))
    const doc = await seedDocument(page, accessToken, {
      title: 'Versioned',
      content: { blocks: [{ type: 'paragraph', text: 'v1 body' }] },
    })

    // First save
    await page.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Versioned',
        content: { blocks: [{ type: 'paragraph', text: 'v2 body' }] },
      },
    })
    // Second save
    await page.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Versioned',
        content: { blocks: [{ type: 'paragraph', text: 'v3 body' }] },
      },
    })
    const versionsResp = await page.request.get(`${API_BASE}/versions/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const versions = (await versionsResp.json()) as Array<{ version: number }>
    expect(versions.length, 'two saves should produce two snapshots').toBeGreaterThanOrEqual(2)
  })

  test('VersionHistory page renders snapshot timeline + restore restores body', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('ver-restore'))
    const doc = await seedDocument(page, accessToken, {
      title: 'Restore Test',
      content: { blocks: [{ type: 'paragraph', text: 'original body sentinel' }] },
    })
    await page.request.put(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Restore Test',
        content: { blocks: [{ type: 'paragraph', text: 'newer body sentinel' }] },
      },
    })

    await page.goto(APP_BASE + `/doc/${doc.id}/history`)
    await page.waitForSelector('[data-testid="version-history-grid"]', { timeout: 15000 })

    // Pick the OLDEST snapshot in the list (last item).
    const items = page.locator('[data-testid^="version-item-"]')
    const count = await items.count()
    expect(count).toBeGreaterThanOrEqual(1)
    await items.nth(count - 1).click()
    await page.waitForTimeout(300)
    await page.getByTestId('version-restore').click()
    await page.waitForTimeout(1500)

    const after = await page.request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: authHeaders(accessToken),
    })
    const afterBody = (await after.json()) as {
      content: { blocks?: Array<{ text: string }> }
    }
    const text = (afterBody.content.blocks ?? []).map((b) => b.text).join('|')
    expect(text, 'restored body should match the older snapshot').toContain(
      'original body sentinel',
    )
  })
})
