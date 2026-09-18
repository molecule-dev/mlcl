import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, INVOICE_TXT, captureNetwork, getAccessToken, signup } from './_helpers'

test.describe('/upload', () => {
  test('renders dropzone + empty queue', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await expect(page.locator('[data-mol-id="upload-page"]')).toBeVisible()
    await expect(page.getByText(/nothing in the queue/i)).toBeVisible()
  })

  test('dropzone file input + submit triggers POST /api/documents/upload and queue updates', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    const uploadBtn = page.locator('[data-mol-id="upload-page"] input[type="file"]').first()
    await expect(uploadBtn.first()).toBeAttached()

    const reqs = await captureNetwork(page, async () => {
      await uploadBtn.setInputFiles({
        name: `ui-invoice-${Date.now()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from(INVOICE_TXT, 'utf8'),
      })
      await page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/api\/documents\/upload/.test(r.url()),
        { timeout: 90_000 },
      )
    })
    const upload = reqs.find((r) => r.method === 'POST' && /\/api\/documents\/upload/.test(r.url))
    expect(upload, 'POST /api/documents/upload should fire').toBeDefined()
    expect(upload!.status, 'upload should respond 201').toBe(201)

    // Queue row appears in "Filed" status (status column has hex green).
    await expect(page.getByText(/filed|complete/i).first()).toBeVisible({ timeout: 30_000 })
  })

  test('after a successful UI upload, the new document is visible in /documents', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    const filename = `ui-list-${Date.now()}.txt`
    await page
      .locator('[data-mol-id="upload-page"] input[type="file"]')
      .first()
      .setInputFiles({
        name: filename,
        mimeType: 'text/plain',
        buffer: Buffer.from(INVOICE_TXT, 'utf8'),
      })
    await page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/documents\/upload/.test(r.url()),
      { timeout: 90_000 },
    )
    // Read-after-write via the API.
    const token = await getAccessToken(page)
    const list = await page.request.get(API_BASE + '/documents', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = await list.json()
    expect(Array.isArray(items)).toBe(true)
    expect(
      items.find(
        (d: { original_name: string; processing_status: string }) =>
          d.original_name === filename && d.processing_status === 'complete',
      ),
      'document should be listed with status=complete',
    ).toBeDefined()
  })

  test('"Clear completed" button drops finished rows from the visible queue', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await page
      .locator('[data-mol-id="upload-page"] input[type="file"]')
      .first()
      .setInputFiles({
        name: `clear-test-${Date.now()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from(INVOICE_TXT, 'utf8'),
      })
    await page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/documents\/upload/.test(r.url()),
      { timeout: 90_000 },
    )
    await page.locator('[data-mol-id="upload-clear-queue"]').click()
    await expect(page.getByText(/nothing in the queue/i)).toBeVisible({ timeout: 5_000 })
  })

  test('uploaded queue row shows the original filename', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    const filename = `queuerow-${Date.now()}.txt`
    await page
      .locator('[data-mol-id="upload-page"] input[type="file"]')
      .first()
      .setInputFiles({
        name: filename,
        mimeType: 'text/plain',
        buffer: Buffer.from(INVOICE_TXT, 'utf8'),
      })
    await page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/documents\/upload/.test(r.url()),
      { timeout: 90_000 },
    )
    await expect(page.getByText(filename).first()).toBeVisible({ timeout: 10_000 })
  })
})
