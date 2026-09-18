import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

test.describe('/files', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/files')
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders the welcome hero for a brand-new account', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/files')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    await expect(page.getByRole('heading', { name: /Welcome back/i }).first()).toBeVisible({
      timeout: 8000,
    })
    await expect(page.getByText(/No files yet/i).first()).toBeVisible()
    expect(
      reqs.some((r) => /\/api\/files($|\?)/.test(r.url) && r.method === 'GET' && r.status === 200),
    ).toBeTruthy()
    expect(
      reqs.some(
        (r) => /\/api\/folders($|\?)/.test(r.url) && r.method === 'GET' && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('newly created file appears in the list and survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/files')

    const upload = await apiUpload(page, 'persistent.txt', 'persisted bytes')
    const file = await apiCreateFileRow(page, {
      name: 'persistent.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })

    await page.reload()
    await expect(page.getByText('persistent.txt').first()).toBeVisible({ timeout: 10000 })

    // Drill into FileDetail for that file id and assert the detail page loads.
    await page.goto(APP_BASE + `/files/${file.id}`)
    await expect(page.getByRole('heading', { name: /persistent\.txt/i }).first()).toBeVisible()
  })

  test('Folders created via the API show up under /api/folders and on a reload of /files', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/files')

    const folderName = 'Inbox'
    const created = await page.evaluate(async (name) => {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'include',
      })
      return { ok: res.ok, status: res.status, body: await res.json() }
    }, folderName)
    expect(created.ok).toBe(true)
    expect(created.status).toBe(201)

    await page.reload()
    await expect(page.getByText(folderName).first()).toBeVisible({ timeout: 10000 })

    const list = await page.evaluate(async () => {
      const res = await fetch('/api/folders', { credentials: 'include' })
      return await res.json()
    })
    expect((list as Array<{ name: string }>).map((f) => f.name)).toContain(folderName)
  })

  test('"Upload" button takes the user to /upload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/files')
    const link = page.getByRole('link', { name: /upload/i }).first()
    await link.click()
    await expect(page).toHaveURL(/\/upload$/)
  })

  test('"Starred" sidebar link navigates to /starred', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/files')
    await page.locator('a[href="/starred"]').first().click()
    await expect(page).toHaveURL(/\/starred$/)
  })

  test('"Trash" sidebar link navigates to /trash', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/files')
    await page.locator('a[href="/trash"]').first().click()
    await expect(page).toHaveURL(/\/trash$/)
  })
})
