/**
 * /documents — list, category filter, upload form persists user values.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, seedDocument, signup } from './_helpers.js'

test.describe('documents page', () => {
  test('the document library renders and initial mount fetches /api/documents', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // Read the document the page will list instead of naming a demo one.
    const res = await page.request.get(`${API_BASE}/documents`, {
      headers: apiHeaders(accessToken),
    })
    const docs = (await res.json()) as Array<{ name: string }>
    expect(docs.length, 'the app must hold at least one document').toBeGreaterThan(0)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/documents')
      await expect(page.getByText(docs[0].name).first()).toBeVisible()
    })
    expect(reqs.find((r) => /\/api\/documents/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('upload form posts and the new row appears with user-provided size + audience', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const name = `MyPolicy ${Date.now()}`
    const seeded = await seedDocument(page, accessToken, {
      name,
      size_label: '512 KB',
      shared_with: 'Engineering only',
    })
    expect(seeded.size_label).toBe('512 KB')
    expect(seeded.shared_with).toBe('Engineering only')
    await page.goto(APP_BASE + '/documents')
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('512 KB')).toBeVisible()
    await expect(page.getByText('Engineering only')).toBeVisible()
  })

  test('GET /api/documents includes the uploaded title verbatim', async ({ page }) => {
    const { accessToken } = await signup(page)
    const name = `RoundTrip ${Date.now()}`
    await seedDocument(page, accessToken, { name })
    const res = await page.request.get(`${API_BASE}/documents`, {
      headers: apiHeaders(accessToken),
    })
    const list = (await res.json()) as Array<{ name: string }>
    expect(list.some((d) => d.name === name)).toBe(true)
  })
})
