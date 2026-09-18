import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

// Cross-page kitchen-sink flow that exercises the primary value
// proposition end-to-end: sign up → upload → see the file in the
// list → drill into detail → download → share publicly → revoke.
// Anything that breaks the typical user's first session shows up
// here, even if every per-page spec passes in isolation.
test.describe('user-journey: signup → upload → share → revoke', () => {
  test('a fresh user can upload, browse, share, download, and revoke a file', async ({
    page,
    browser,
  }) => {
    const { email } = await signup(page)
    expect(email).toBeTruthy()

    // 1. Land on /files with the empty hero.
    await page.goto(APP_BASE + '/files')
    await expect(page.getByRole('heading', { name: /Welcome back/i }).first()).toBeVisible({
      timeout: 10000,
    })

    // 2. Upload a real file via the production /api/uploads pipeline.
    await page.goto(APP_BASE + '/upload')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="upload-file-input"]').setInputFiles({
        name: 'journey.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('journey bytes — production-ready'),
      })
      await expect(page.locator('[data-mol-id^="upload-view-"]').first()).toBeVisible({
        timeout: 30000,
      })
    })
    const upload = reqs.find((r) => /\/api\/uploads$/.test(r.url) && r.method === 'POST')
    expect(upload?.status).toBe(201)
    // SECURITY contract: a byte upload is a SINGLE round-trip — POST /api/uploads
    // creates the metadata row itself (server-minted storage key bound to the
    // owner). The client never POSTs to /api/files with a key (that was a
    // cross-tenant S3-read IDOR), so no separate POST /api/files fires here.
    const meta = reqs.find((r) => /\/api\/files$/.test(r.url) && r.method === 'POST')
    expect(meta, 'no separate POST /api/files for a byte upload (single round-trip)').toBeFalsy()

    // 3. Browse back to /files and see the new row.
    await page.goto(APP_BASE + '/files')
    await expect(page.getByText('journey.txt').first()).toBeVisible({ timeout: 10000 })

    // 4. Drill in to FileDetail.
    const list = await page.evaluate(async () => {
      const res = await fetch('/api/files', { credentials: 'include' })
      return await res.json()
    })
    const row = (list as Array<{ id: string; name: string }>).find((f) => f.name === 'journey.txt')
    expect(row).toBeTruthy()
    const fileId = row!.id
    await page.goto(APP_BASE + `/files/${fileId}`)
    await expect(page.getByRole('heading', { name: /journey\.txt/i }).first()).toBeVisible()

    // 5. Download href is a real /api/files/:id/download route.
    await expect(page.locator('[data-mol-id="filedetail-download"]')).toHaveAttribute(
      'href',
      new RegExp(`/api/files/${fileId}/download`),
    )

    // 6. Star the file; the next GET reflects is_starred=true.
    await page.locator('[data-mol-id="filedetail-star"]').click()
    await page.waitForTimeout(500)
    const starred = await page.evaluate(async (id) => {
      const res = await fetch(`/api/files/${id}`, { credentials: 'include' })
      return await res.json()
    }, fileId)
    expect((starred as { is_starred: boolean }).is_starred).toBe(true)

    // 7. Create a public share link, view it anonymously, then revoke.
    await page.locator('[data-mol-id="filedetail-share"]').click()
    await expect(page.locator('[data-mol-id="filedetail-share-success"]')).toBeVisible({
      timeout: 8000,
    })
    const shares = await page.evaluate(async (id) => {
      const res = await fetch(`/api/shares?file_id=${id}`, { credentials: 'include' })
      return await res.json()
    }, fileId)
    expect(Array.isArray(shares)).toBe(true)
    const share = (shares as Array<{ id: string; token: string }>)[0]
    expect(share?.token).toBeTruthy()

    // Open the share link in a fresh anonymous context.
    const anonCtx = await browser.newContext()
    const anon = await anonCtx.newPage()
    await anon.goto(APP_BASE + `/s/${share.token}`)
    await expect(
      anon.getByRole('heading', { name: /A file has been shared with you/i }),
    ).toBeVisible()
    await expect(anon.locator('[data-mol-id="share-public-download"]')).toHaveAttribute(
      'href',
      new RegExp(`/api/shares/public/${share.token}/download`),
    )
    await anonCtx.close()

    // Revoke from the owner side.
    await page.locator(`[data-mol-id="filedetail-share-revoke-${share.id}"]`).click()
    await page.waitForTimeout(500)
    const after = await page.evaluate(async (id) => {
      const res = await fetch(`/api/shares?file_id=${id}`, { credentials: 'include' })
      return await res.json()
    }, fileId)
    expect((after as Array<unknown>).length).toBe(0)

    // 8. Trash the file and confirm it appears in /trash.
    await page.locator('[data-mol-id="filedetail-delete"]').click()
    await expect(page).toHaveURL(/\/trash$/, { timeout: 10000 })
    const trashed = await page.evaluate(async () => {
      const res = await fetch('/api/files?trash=true', { credentials: 'include' })
      return await res.json()
    })
    expect((trashed as Array<{ id: string }>).some((f) => f.id === fileId)).toBe(true)
  })
})
