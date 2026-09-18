import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('upload — drop a file, see a model row, library reflects it', () => {
  test('Picking a file via the dropzone creates a model the library shows', async ({ page }) => {
    await signup(page)

    // Seed counts before the upload so we can assert a delta of +1.
    const before = await api<unknown[]>(page, 'GET', '/models')
    const beforeCount = before.length

    await page.goto(APP_BASE + '/upload')
    await expect(page.getByRole('heading', { name: /upload\s*models/i })).toBeVisible()

    const filename = `e2e-upload-${Date.now()}.glb`
    const fileBuffer = Buffer.from('binary-3d-data', 'utf8')
    await page.locator('[data-testid="upload-file-input"]').setInputFiles({
      name: filename,
      mimeType: 'model/gltf-binary',
      buffer: fileBuffer,
    })

    // The queue must show our file with status="ready" within a few seconds.
    const queueItem = page.locator('[data-mol-id="upload-queue-item"]').first()
    await expect(queueItem).toBeVisible({ timeout: 15_000 })
    await expect(queueItem).toHaveAttribute('data-status', 'ready', { timeout: 15_000 })
    await expect(queueItem).toContainText(filename)

    // Read-after-write: the API now returns one more model.
    const after = await api<Array<{ name: string; file_size: number | string; format: string }>>(
      page,
      'GET',
      '/models',
    )
    expect(after.length, 'model count incremented').toBe(beforeCount + 1)
    const newModel = after.find((m) => m.name === filename.replace(/\.[a-z0-9]+$/i, ''))
    expect(newModel, 'new model row exists with correct name').toBeTruthy()
    // pg returns bigint columns as strings — coerce so the comparison is honest.
    expect(Number(newModel!.file_size), 'file_size persisted').toBe(fileBuffer.length)
    expect(newModel!.format, 'format inferred from extension').toBe('glb')

    // The "Open in editor" link points to a real edit URL we can navigate to.
    const editLink = queueItem.locator('[data-mol-id="upload-queue-edit-link"]')
    await expect(editLink).toBeVisible()
    const href = await editLink.getAttribute('href')
    expect(href).toMatch(/\/models\/[^/]+\/edit/)
  })

  test('Server-rejected payload (POST /models with invalid format) returns 400 — confirms error path is real', async ({
    page,
  }) => {
    await signup(page)
    // Drive the real backend with a malformed payload (unsupported format).
    // We use the page's own session cookies via page.request so this is the
    // exact same code path the dropzone exercises; on error the queue item
    // would land in status="error" and surface the message inline.
    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const resp = await page.request.fetch(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/models',
      {
        method: 'POST',
        headers: { Cookie: cookieStr, 'Content-Type': 'application/json' },
        data: JSON.stringify({ name: '', file_url: '', format: 'totally-invalid' }),
      },
    )
    expect(resp.status(), 'malformed POST is rejected with 4xx').toBeGreaterThanOrEqual(400)
    expect(resp.status(), 'and < 500 — handler did not crash').toBeLessThan(500)
  })

  test('"Clear Queue" empties the visible queue (UI lifted state, not just a fake call)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')

    await page.locator('[data-testid="upload-file-input"]').setInputFiles({
      name: `clear-test-${Date.now()}.glb`,
      mimeType: 'model/gltf-binary',
      buffer: Buffer.from('x'),
    })
    const queueItem = page.locator('[data-mol-id="upload-queue-item"]').first()
    await expect(queueItem).toBeVisible({ timeout: 10_000 })

    await page.locator('[data-mol-id="upload-clear-queue"]').click()
    // Queue now reports zero rows.
    await expect(page.locator('[data-mol-id="upload-queue"]')).toHaveAttribute(
      'data-queue-count',
      '0',
      { timeout: 5_000 },
    )
  })

  test('"View Library" navigates to /models', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await page.locator('[data-mol-id="upload-view-library"]').click()
    await expect(page).toHaveURL(/\/models$/)
  })
})
