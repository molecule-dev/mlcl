import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

async function setupFileForUser(page: import('@playwright/test').Page) {
  const upload = await apiUpload(page, 'detail-target.txt', 'detail target bytes')
  const file = await apiCreateFileRow(page, {
    name: 'detail-target.txt',
    mime: 'text/plain',
    size: upload.size,
    storage_key: upload.storage_key,
  })
  return file
}

test.describe('/files/:id', () => {
  test('renders the file metadata sidebar after a real upload', async ({ page }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    await expect(page.getByRole('heading', { name: /detail-target\.txt/i }).first()).toBeVisible()
    await expect(page.getByText('text/plain').first()).toBeVisible()
  })

  test('"Download" button has a real /api/files/:id/download href', async ({ page }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    const link = page.locator('[data-mol-id="filedetail-download"]')
    await expect(link).toHaveAttribute('href', new RegExp(`/api/files/${file.id}/download`))
  })

  test('"Star" button toggles is_starred on the row (POST /:id/star)', async ({ page }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="filedetail-star"]').click()
      await page.waitForTimeout(800)
    })
    expect(
      reqs.some((r) => /\/star$/.test(r.url) && r.method === 'POST' && r.status === 200),
    ).toBeTruthy()

    const after = await page.evaluate(async (id) => {
      const res = await fetch(`/api/files/${id}`, { credentials: 'include' })
      return await res.json()
    }, file.id)
    expect((after as { is_starred: boolean }).is_starred).toBe(true)
  })

  test('"Rename" wires through PATCH /api/files/:id and the new name persists across reload', async ({
    page,
  }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    await page.locator('[data-mol-id="filedetail-rename"]').click()
    await page.locator('[data-mol-id="filedetail-rename-input"]').fill('renamed.txt')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="filedetail-rename-confirm"]').click()
      await page.waitForTimeout(1000)
    })
    expect(
      reqs.some((r) => new RegExp(`/api/files/${file.id}$`).test(r.url) && r.method === 'PATCH'),
    ).toBeTruthy()
    await page.reload()
    await expect(page.getByRole('heading', { name: /renamed\.txt/i }).first()).toBeVisible()
  })

  test('"Move to trash" sends DELETE and routes the user to /trash', async ({ page }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="filedetail-delete"]').click()
      await expect(page).toHaveURL(/\/trash$/, { timeout: 10000 })
    })
    expect(
      reqs.some((r) => new RegExp(`/api/files/${file.id}$`).test(r.url) && r.method === 'DELETE'),
    ).toBeTruthy()

    const trashed = await page.evaluate(async () => {
      const res = await fetch('/api/files?trash=true', { credentials: 'include' })
      return await res.json()
    })
    expect((trashed as Array<{ id: string }>).some((row) => row.id === file.id)).toBe(true)
  })

  test('"Create share link" creates a share row and the visible link points to /s/:token', async ({
    page,
  }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="filedetail-share"]').click()
      await expect(page.locator('[data-mol-id="filedetail-share-success"]')).toBeVisible({
        timeout: 8000,
      })
    })
    expect(
      reqs.some((r) => /\/api\/shares$/.test(r.url) && r.method === 'POST' && r.status === 201),
    ).toBeTruthy()
    await expect(page.getByText(/\/s\//).first()).toBeVisible()
  })

  test('Revoking a share link removes it from the panel and from /api/shares', async ({ page }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    await page.locator('[data-mol-id="filedetail-share"]').click()
    await expect(page.locator('[data-mol-id="filedetail-share-success"]')).toBeVisible({
      timeout: 8000,
    })

    const before = await page.evaluate(async (id) => {
      const res = await fetch(`/api/shares?file_id=${id}`, { credentials: 'include' })
      return await res.json()
    }, file.id)
    expect((before as Array<unknown>).length).toBeGreaterThan(0)

    const revoke = page.getByRole('button', { name: /Revoke link/i }).first()
    await revoke.click()
    await page.waitForTimeout(500)

    const after = await page.evaluate(async (id) => {
      const res = await fetch(`/api/shares?file_id=${id}`, { credentials: 'include' })
      return await res.json()
    }, file.id)
    expect((after as Array<unknown>).length).toBe(0)
  })

  test('"Back" button returns the user to /files', async ({ page }) => {
    await signup(page)
    const file = await setupFileForUser(page)
    await page.goto(APP_BASE + `/files/${file.id}`)
    await page.locator('[data-mol-id="filedetail-back"]').click()
    await expect(page).toHaveURL(/\/files$/)
  })

  test('Foreign file IDs are rejected (404 cross-user check)', async ({ page, browser }) => {
    // Sign up user A and create a file using the page fixture (gets video).
    await signup(page)
    const file = await setupFileForUser(page)

    // Sign up user B in a fresh context — they must not see user A's file.
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB)
    const status = await pageB.evaluate(async (id) => {
      const res = await fetch(`/api/files/${id}`, { credentials: 'include' })
      return res.status
    }, file.id)
    expect(status).toBe(404)
    await ctxB.close()
  })
})
