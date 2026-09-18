import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

test.describe('/recent', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/recent')
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders the page and queries /api/files (or /api/activity) on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/recent')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const hit =
      reqs.some((r) => /\/api\/files($|\?)/.test(r.url) && r.status === 200) ||
      reqs.some((r) => /\/api\/activity/.test(r.url) && r.status === 200)
    expect(hit).toBeTruthy()
  })

  test('newly uploaded file shows on /recent without manual refresh after navigation', async ({
    page,
  }) => {
    await signup(page)
    const upload = await apiUpload(page, 'fresh.txt', 'recent bytes')
    await apiCreateFileRow(page, {
      name: 'fresh.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.goto(APP_BASE + '/recent')
    await expect(page.getByText('fresh.txt').first()).toBeVisible({ timeout: 10000 })
  })

  test('clicking a recent file row navigates to /files/:id', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'click-me.txt', 'click bytes')
    const file = await apiCreateFileRow(page, {
      name: 'click-me.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.goto(APP_BASE + '/recent')
    await expect(page.getByText('click-me.txt').first()).toBeVisible({ timeout: 10000 })
    const link = page.locator(`a[href="/files/${file.id}"]`).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(new RegExp(`/files/${file.id}$`))
    } else {
      await page.getByText('click-me.txt').first().click()
      await expect(page).toHaveURL(/\/files\//)
    }
  })
})
