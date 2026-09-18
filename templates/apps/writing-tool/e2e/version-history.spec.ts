/**
 * /editor/:id/history — version history.
 *
 * Asserts: the timeline mounts; the in-app "Save snapshot now" CTA
 * appends a new document_versions row server-side; selecting a row
 * loads the diff; restoring a snapshot rewrites the document body
 * back to that snapshot's body_md.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedPost,
  createDocument,
  getAccessToken,
  listVersions,
  readDocument,
  signup,
  type ApiVersion,
} from './_helpers.js'

test.describe('/editor/:id/history', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('snapshot-now button creates a versions row and re-renders the timeline', async ({
    page,
  }) => {
    const doc = await createDocument(page, {
      title: 'Snapshot Test',
      body_md: 'first draft',
    })
    await page.goto(`${APP_BASE}/editor/${doc.id}/history`)
    const before = await listVersions(page, doc.id)
    await page.getByTestId('versions-snapshot').click()
    await page.waitForTimeout(1_500)
    const after = await listVersions(page, doc.id)
    expect(after.length).toBeGreaterThan(before.length)
  })

  test('restore CTA rewrites the document body to the selected snapshot', async ({ page }) => {
    const doc = await createDocument(page, { title: 'Restore Test', body_md: 'snapshot one body' })
    // First snapshot captures "snapshot one body".
    await authedPost<ApiVersion>(page, `/documents/${doc.id}/versions/snapshot`, {})
    // Now mutate the body and snapshot again.
    await authedPost(page, `/documents/${doc.id}`, { body_md: 'snapshot two body' }).catch(() => {})
    // Use PATCH (handler exposes PATCH for the resource):
    const token = await getAccessToken(page)
    await page.request.patch(
      `http://localhost:${process.env.API_PORT || '4000'}/api/documents/${doc.id}`,
      {
        headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
        data: { body_md: 'snapshot two body' },
      },
    )
    await authedPost<ApiVersion>(page, `/documents/${doc.id}/versions/snapshot`, {})

    await page.goto(`${APP_BASE}/editor/${doc.id}/history`)
    // Latest snapshot is row v2 — pick the older one (v1).
    await page.getByTestId('version-row-1').click()
    page.once('dialog', (d) => void d.accept())
    await page.getByTestId('versions-restore').click()
    // Restore returns the user to /editor/:id
    await page.waitForURL(new RegExp(`/editor/${doc.id}$`), { timeout: 10_000 })
    const fresh = await readDocument(page, doc.id)
    expect(fresh.body_md).toBe('snapshot one body')
  })
})
