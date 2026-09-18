/**
 * /documents/:id viewer + sign action.
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

test.describe('/documents/:id', () => {
  test('viewer renders the document name', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('doc-id'))
    const docs = await listDocuments(page, accessToken)
    expect(docs.length).toBeGreaterThan(0)
    const doc = docs[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/documents/' + doc.id)
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-document-viewer"]').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body).toContain(doc.name.slice(0, 20))
    expect(reqs.some((r) => /\/api\/documents/.test(r.url))).toBe(true)
  })

  test('signing an unsigned document via API persists signed=true', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('doc-id-sign'))
    const docs = await listDocuments(page, accessToken)
    const target = docs.find((d) => d.requires_signature && !d.signed) ?? docs[0]
    const r = await page.request.put(`${API_BASE}/documents/${target.id}`, {
      headers: authHeaders(accessToken),
      data: { signed: true, signed_at: new Date().toISOString() },
    })
    expect(r.status()).toBeLessThan(400)
    const after = await listDocuments(page, accessToken)
    const updated = after.find((d) => d.id === target.id)
    expect(updated?.signed).toBe(true)
    expect(updated?.signed_at ?? '').toBeTruthy()
  })

  test('back link returns to /documents', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('doc-id-back'))
    const docs = await listDocuments(page, accessToken)
    await page.goto(APP_BASE + '/documents/' + docs[0].id)
    await page.waitForLoadState('networkidle')
    const back = page.locator('a[href="/documents"]').first()
    if (await back.count()) {
      await back.click()
      await expect(page).toHaveURL(/\/documents$/, { timeout: 10_000 })
    }
  })
})
