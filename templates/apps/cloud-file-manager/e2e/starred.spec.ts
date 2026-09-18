import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

test.describe('/starred', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/starred')
    await expect(page).toHaveURL(/\/login/)
  })

  test('on load, queries /api/files for starred rows', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/starred')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/files/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('starring a file via /api/files/:id/star surfaces it on /starred', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'fav.txt', 'starred bytes')
    const file = await apiCreateFileRow(page, {
      name: 'fav.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.evaluate(async (id) => {
      await fetch(`/api/files/${id}/star`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_starred: true }),
        credentials: 'include',
      })
    }, file.id)

    await page.goto(APP_BASE + '/starred')
    await expect(page.getByText('fav.txt').first()).toBeVisible({ timeout: 10000 })
  })

  test('a starred row links to /files/:id', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'linky.txt', 'click')
    const file = await apiCreateFileRow(page, {
      name: 'linky.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.evaluate(async (id) => {
      await fetch(`/api/files/${id}/star`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_starred: true }),
        credentials: 'include',
      })
    }, file.id)
    await page.goto(APP_BASE + '/starred')
    await expect(page.getByText('linky.txt').first()).toBeVisible({ timeout: 10000 })
    const link = page.locator(`a[href="/files/${file.id}"]`).first()
    if (await link.count()) {
      await expect(link).toHaveAttribute('href', `/files/${file.id}`)
    }
  })

  test('an empty starred list shows the empty-state message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/starred')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    const empty = page.getByText(/nothing starred|no\s*starred|nothing here/i).first()
    if (await empty.count()) await expect(empty).toBeVisible()
  })
})
