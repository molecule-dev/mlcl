import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uploadInvoice } from './_helpers'

test.describe('/documents', () => {
  test('empty state when no documents yet — page mount fires GET /api/documents', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/documents')
      await page.waitForResponse(
        (r) => /\/api\/documents(?:\?|$)/.test(r.url()) && r.status() === 200,
        { timeout: 15_000 },
      )
    })
    const docsGet = reqs.find((r) => r.method === 'GET' && /\/api\/documents(?:\?|$)/.test(r.url))
    expect(docsGet, 'GET /api/documents must fire on page load').toBeDefined()
    expect(docsGet!.status).toBe(200)
    await expect(page.locator('[data-mol-id="documents-page"]')).toBeVisible()
    await expect(page.getByText(/no documents/i)).toBeVisible()
  })

  test('after uploading an invoice, /documents shows a card with the right type', async ({
    page,
  }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    await page.goto(APP_BASE + '/documents')
    await page.waitForResponse((r) => /\/api\/documents/.test(r.url()) && r.status() === 200, {
      timeout: 15_000,
    })
    // The card is rendered with the original_name.
    await expect(page.getByText(uploaded.original_name).first()).toBeVisible({ timeout: 15_000 })
    // It should also say "Invoice" somewhere within the card area
    await expect(page.getByText(/invoice/i).first()).toBeVisible()
  })

  test('"Upload documents" CTA routes to /upload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/documents')
    await page.locator('[data-mol-id="documents-upload-cta"]').click()
    await expect(page).toHaveURL(/\/upload$/)
  })

  test('Type filter narrows the visible list to the chosen class', async ({ page }) => {
    await signup(page)
    await uploadInvoice(page)
    await page.goto(APP_BASE + '/documents')
    await page.waitForResponse((r) => /\/api\/documents/.test(r.url()) && r.status() === 200)
    // Click "Receipts" filter — invoice list should empty.
    await page
      .getByRole('button', { name: /^receipts$/i })
      .first()
      .click()
    await expect(page.getByText(/no documents match/i)).toBeVisible({ timeout: 8_000 })
    // Switch back to All — it should reappear.
    await page.getByRole('button', { name: /^all$/i }).first().click()
    await expect(page.getByText(/^.{1,200}\.txt$/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test('Search input filters by filename', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page, `unique-prefix-search-${Date.now()}.txt`)
    // Arm the response wait BEFORE goto — the /api/documents fetch can resolve
    // before the awaiter subscribes, causing a 15s timeout.
    const docsResponse = page.waitForResponse(
      (r) => /\/api\/documents/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/documents')
    await docsResponse
    await page.locator('[data-mol-id="documents-search"]').fill('unique-prefix-search')
    await expect(page.getByText(uploaded.original_name).first()).toBeVisible()
    await page.locator('[data-mol-id="documents-search"]').fill('___no_match___')
    await expect(page.getByText(/no documents match/i)).toBeVisible({ timeout: 5_000 })
  })
})
