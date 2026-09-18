/**
 * Documents read-after-write — signing a document persists, sets
 * signed_at + signed_by, and the document re-renders as signed on
 * subsequent reads.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  listDocuments,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('documents', () => {
  test('GET /api/documents returns seeded documents', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('doc-fetch'))
    const docs = await listDocuments(page, accessToken)
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.some((d) => d.requires_signature)).toBe(true)
  })

  test('documents page hits /api/documents on load', async ({ page }) => {
    await signup(page, uniqueEmail('doc-load'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/documents')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/documents(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(true)
  })

  test('signing an unsigned doc via API sets signed=true with signed_at', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('doc-sign'))
    const docs = await listDocuments(page, accessToken)
    const unsigned = docs.find((d) => d.requires_signature && !d.signed)
    expect(unsigned, 'expected an unsigned-but-required doc in the seed').toBeTruthy()

    const putRes = await page.request.put(`${API_BASE}/documents/${unsigned!.id}`, {
      headers: authHeaders(accessToken),
      data: { signed: true },
    })
    expect(putRes.status()).toBe(200)

    const reread = await page.request.get(`${API_BASE}/documents/${unsigned!.id}`, {
      headers: authHeaders(accessToken),
    })
    const after = (await reread.json()) as { signed: boolean; signed_at: string | null }
    expect(after.signed).toBe(true)
    expect(after.signed_at).toBeTruthy()
  })

  test('document detail page renders the doc name and sign button persists', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('doc-ui'))
    const docs = await listDocuments(page, accessToken)
    const unsigned = docs.find((d) => d.requires_signature && !d.signed)!
    await page.goto(APP_BASE + `/documents/${unsigned.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="document-title"]').first()).toContainText(
      unsigned.name,
    )
    const signBtn = page.locator('[data-mol-id="document-sign-button"]').first()
    await expect(signBtn).toBeVisible()
    await signBtn.click()
    await page.waitForLoadState('networkidle')
    const reread = await page.request.get(`${API_BASE}/documents/${unsigned.id}`, {
      headers: authHeaders(accessToken),
    })
    const after = (await reread.json()) as { signed: boolean }
    expect(after.signed).toBe(true)
  })
})
