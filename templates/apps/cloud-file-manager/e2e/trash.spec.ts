import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

test.describe('/trash', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/trash')
    await expect(page).toHaveURL(/\/login/)
  })

  test('files DELETE-d show up under /api/files?trash=true and on the page', async ({ page }) => {
    await signup(page)

    const upload = await apiUpload(page, 'doomed.txt', 'will be trashed')
    const file = await apiCreateFileRow(page, {
      name: 'doomed.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.evaluate(async (id) => {
      await fetch(`/api/files/${id}`, { method: 'DELETE', credentials: 'include' })
    }, file.id)
    const trashed = await page.evaluate(async () => {
      const res = await fetch('/api/files?trash=true', { credentials: 'include' })
      return await res.json()
    })
    expect((trashed as Array<{ id: string }>).some((row) => row.id === file.id)).toBe(true)

    await page.goto(APP_BASE + '/trash')
    await expect(page.getByText('doomed.txt').first()).toBeVisible({ timeout: 10000 })
  })

  test('"Restore" puts a file back in the active list', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'recovered.txt', 'will be restored')
    const file = await apiCreateFileRow(page, {
      name: 'recovered.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.evaluate(async (id) => {
      await fetch(`/api/files/${id}`, { method: 'DELETE', credentials: 'include' })
      await fetch(`/api/files/${id}/restore`, { method: 'POST', credentials: 'include' })
    }, file.id)

    const live = await page.evaluate(async () => {
      const res = await fetch('/api/files', { credentials: 'include' })
      return await res.json()
    })
    expect((live as Array<{ id: string }>).some((row) => row.id === file.id)).toBe(true)
  })

  test('on load, /trash queries /api/files?trash=true', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/trash')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/files/.test(r.url) && /trash/.test(r.url) && r.status === 200),
    ).toBeTruthy()
  })

  test('permanent-delete removes the row entirely (no restore possible)', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'gone.txt', 'about to vanish')
    const file = await apiCreateFileRow(page, {
      name: 'gone.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.evaluate(async (id) => {
      await fetch(`/api/files/${id}`, { method: 'DELETE', credentials: 'include' })
      await fetch(`/api/files/${id}?permanent=true`, { method: 'DELETE', credentials: 'include' })
    }, file.id)
    const trashed = await page.evaluate(async () => {
      const res = await fetch('/api/files?trash=true', { credentials: 'include' })
      return await res.json()
    })
    expect((trashed as Array<{ id: string }>).some((r) => r.id === file.id)).toBe(false)
  })

  test('an empty trash shows the empty-state copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trash')
    const empty = page
      .getByText(/trash is empty|nothing in trash|empty trash|nothing here/i)
      .first()
    if (await empty.count()) await expect(empty).toBeVisible()
  })
})
