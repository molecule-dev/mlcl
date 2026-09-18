import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/upload', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/upload')
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders dropzone, choose-files button and choose-folder button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await expect(page.locator('[data-mol-id="upload-dropzone"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="upload-choose-files"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="upload-choose-folder"]')).toBeVisible()
  })

  test('"Back to files" button returns to /files', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await page.locator('[data-mol-id="upload-back"]').click()
    await expect(page).toHaveURL(/\/files$/)
  })

  test('Choosing a real file POSTs bytes to /api/uploads which creates the metadata row in one round-trip', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="upload-file-input"]').setInputFiles({
        name: 'note.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('hello nimbus'),
      })
      // Wait for the per-row "View" button to render — that only happens
      // after status === 'done' AND a fileId has been set, which means
      // /api/uploads has responded with the created file row.
      await expect(page.locator('[data-mol-id^="upload-view-"]').first()).toBeVisible({
        timeout: 30000,
      })
    })

    const upload = reqs.find((r) => /\/api\/uploads$/.test(r.url) && r.method === 'POST')
    expect(upload, 'multipart upload request fired').toBeTruthy()
    expect(upload!.status).toBe(201)

    // SECURITY contract: a byte upload is a SINGLE round-trip. POST /api/uploads
    // creates the metadata row itself, bound to the server-minted storage key —
    // the client never POSTs to /api/files with a key (that was a cross-tenant
    // S3-read IDOR). So no separate POST /api/files fires during a byte upload.
    const meta = reqs.find((r) => /\/api\/files$/.test(r.url) && r.method === 'POST')
    expect(meta, 'no separate POST /api/files for a byte upload (single round-trip)').toBeFalsy()

    // After the upload completes, the underlying row should be visible on /files.
    await page.goto(APP_BASE + '/files')
    await expect(page.getByText('note.txt').first()).toBeVisible({ timeout: 10000 })
  })

  test('Uploaded file is downloadable from the API with the original bytes', async ({
    page,
    request,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')

    await page.locator('[data-mol-id="upload-file-input"]').setInputFiles({
      name: 'roundtrip.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('roundtrip-bytes'),
    })
    await expect(page.locator('[data-mol-id^="upload-view-"]').first()).toBeVisible({
      timeout: 30000,
    })

    const ctx = page.context()
    const cookies = await ctx.cookies()
    const token = cookies.find((c) => c.name === 'token')?.value

    const list = await page.evaluate(async () => {
      const res = await fetch('/api/files', { credentials: 'include' })
      return await res.json()
    })
    const row = (list as Array<{ id: string; name: string }>).find(
      (f) => f.name === 'roundtrip.txt',
    )
    expect(row).toBeTruthy()

    const apiUrl = `http://localhost:${process.env.API_PORT || '4020'}`
    const dl = await request.get(`${apiUrl}/api/files/${row!.id}/download`, {
      headers: token ? { cookie: `token=${token}` } : {},
    })
    expect(dl.status()).toBe(200)
    expect(await dl.text()).toBe('roundtrip-bytes')
    expect(dl.headers()['content-disposition']).toContain('roundtrip.txt')
  })

  test('Empty queue shows the idle hint', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await expect(
      page.getByText(/No active uploads|Drop files into the area above/i).first(),
    ).toBeVisible()
  })

  test('"Choose folder" button has a webkitdirectory file input wired to it', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    const folderInput = page.locator('[data-mol-id="upload-folder-input"]')
    await expect(folderInput).toHaveAttribute('webkitdirectory', /.*/)
  })

  test('Per-file row mounts after queueing with status + a view button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await page.locator('[data-mol-id="upload-file-input"]').setInputFiles({
      name: 'rowcheck.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('row-bytes'),
    })
    await expect(page.locator('[data-mol-id^="upload-row-"]').first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-mol-id^="upload-view-"]').first()).toBeVisible({
      timeout: 30000,
    })
    await page.locator('[data-mol-id^="upload-view-"]').first().click()
    await expect(page).toHaveURL(/\/files\//)
  })
})
