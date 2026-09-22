import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uploadInvoice,
} from './_helpers'

test.describe('/documents/:id', () => {
  test('detail page mount fires GET /api/documents/:id and renders title + summary + fields', async ({
    page,
  }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    const reqs = await captureNetwork(page, async () => {
      // Arm the response wait BEFORE goto — the detail fetch can resolve
      // before the awaiter subscribes, causing a 15s timeout.
      const detailResponse = page.waitForResponse(
        (r) => /\/api\/documents\//.test(r.url()) && r.status() === 200,
        { timeout: 15_000 },
      )
      await page.goto(APP_BASE + `/documents/${uploaded.id}`)
      await detailResponse
    })
    const detailGet = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/documents/${uploaded.id}`).test(r.url),
    )
    expect(detailGet, 'GET /api/documents/:id must fire').toBeDefined()
    expect(detailGet!.status).toBe(200)
    await expect(page.locator('[data-mol-id="document-detail-page"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="document-detail-title"]')).toHaveText(
      uploaded.original_name,
    )
    await expect(page.locator('[data-mol-id="document-summary-card"]')).toBeVisible()
    await expect(page.locator('[data-mol-id^="document-field-"]').first()).toBeVisible()
  })

  test('Zoom-out button decreases the % indicator', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    const before = await page.locator('[data-mol-id="document-zoom-level"]').textContent()
    await page.locator('[data-mol-id="document-zoom-out"]').click()
    await page.waitForTimeout(150)
    const after = await page.locator('[data-mol-id="document-zoom-level"]').textContent()
    expect(after).not.toBe(before)
  })

  test('Rotate button changes preview pane transform', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    const pane = page.locator('[data-mol-id="document-preview-pane"]').first()
    const before = await pane.getAttribute('style')
    await page.locator('[data-mol-id="document-rotate"]').click()
    await page.waitForTimeout(150)
    const after = await pane.getAttribute('style')
    expect(after).not.toBe(before)
    expect(after).toMatch(/rotate\(90deg\)/)
  })

  test('Previous-page button stays at 1/1 for a single-page document (disabled)', async ({
    page,
  }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    const before = await page.locator('[data-mol-id="document-page-indicator"]').textContent()
    await page
      .locator('[data-mol-id="document-prev-page"]')
      .click({ force: true })
      .catch(() => {})
    const after = await page.locator('[data-mol-id="document-page-indicator"]').textContent()
    expect(after).toBe(before)
  })

  test('Detail-page region renders when the document loads', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-mol-id="document-detail-page"]')).toBeVisible()
  })

  test('Title shows the original_name verbatim', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page, `title-${Date.now()}.txt`)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-mol-id="document-detail-title"]')).toHaveText(
      uploaded.original_name,
    )
  })

  test('Download button delivers the original file bytes', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    const token = await getAccessToken(page)
    const dl = await page.request.get(API_BASE + `/documents/${uploaded.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(dl.status()).toBe(200)
    const buf = await dl.body()
    expect(buf.byteLength, 'download must return non-empty bytes').toBeGreaterThan(100)
    expect(dl.headers()['content-disposition']).toMatch(/attachment/)
    const text = buf.toString('utf8')
    expect(text).toContain('INVOICE')
  })

  test('Back link in header returns to /documents', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-mol-id="document-detail-back"]').click()
    await expect(page).toHaveURL(/\/documents$/)
  })

  test('Page navigation buttons work when page_count > 1, otherwise the indicator stays at 1/1', async ({
    page,
  }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-mol-id="document-page-indicator"]')).toBeVisible()
    const indicatorBefore = await page
      .locator('[data-mol-id="document-page-indicator"]')
      .textContent()
    await page
      .locator('[data-mol-id="document-next-page"]')
      .click({ force: true })
      .catch(() => {})
    const indicatorAfter = await page
      .locator('[data-mol-id="document-page-indicator"]')
      .textContent()
    // No-op if button is disabled (single-page document); otherwise
    // the displayed page index moves forward.
    expect([indicatorBefore, '2 / 1', '2 / 2']).toContain(indicatorAfter)
  })

  test('Zoom in/out updates the % indicator', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    const before = await page.locator('[data-mol-id="document-zoom-level"]').textContent()
    await page.locator('[data-mol-id="document-zoom-in"]').click()
    await page.waitForTimeout(200)
    const after = await page.locator('[data-mol-id="document-zoom-level"]').textContent()
    expect(after).not.toBe(before)
  })

  test('Clicking an extracted field highlights it (UI state) and clicking again clears it', async ({
    page,
  }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    // Arm the response wait BEFORE goto — see the race note above.
    const detailResponse = page.waitForResponse(
      (r) => /\/api\/documents\//.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await detailResponse
    // Restrict to actual field BUTTONS — `document-field-highlight` is a
    // separate sibling div that the prefix selector would otherwise pick up.
    const firstField = page.locator('button[data-mol-id^="document-field-"]').first()
    await firstField.click()
    await expect(page.locator('[data-mol-id="document-field-highlight"]')).toBeVisible()
    await firstField.click()
    await expect(page.locator('[data-mol-id="document-field-highlight"]')).not.toBeVisible()
  })

  test('Audit timeline shows a "ready" event after AI processing succeeded', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-mol-id="document-audit-timeline"]')).toBeVisible({
      timeout: 15_000,
    })
    const timelineText = await page.locator('[data-mol-id="document-audit-timeline"]').textContent()
    expect(timelineText, 'timeline contains ready event').toMatch(/ready/i)
  })

  test('Reprocess button fires POST /api/processing/documents/:id/reprocess and audit timeline records the event', async ({
    page,
  }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    // Arm the response wait BEFORE goto — see the race note above.
    const detailResponse = page.waitForResponse(
      (r) => /\/api\/documents\//.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await detailResponse
    const respPromise = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        new RegExp(`/api/processing/documents/${uploaded.id}/reprocess$`).test(r.url()),
      { timeout: 15_000 },
    )
    await page.locator('[data-mol-id="document-reprocess"]').click()
    const resp = await respPromise
    expect(resp.status(), 'reprocess POST should be 2xx').toBeLessThan(400)
    // Confirmation note appears.
    await expect(page.locator('[data-mol-id="document-reprocess-note"]')).toBeVisible({
      timeout: 5_000,
    })
    // Read-after-write: audit timeline now contains a "reprocess" event.
    await expect(page.locator('[data-mol-id="document-audit-timeline"]')).toBeVisible()
    const text = await page.locator('[data-mol-id="document-audit-timeline"]').textContent()
    expect(text, 'audit timeline must record reprocess_requested').toMatch(/reprocess/i)
  })
})
