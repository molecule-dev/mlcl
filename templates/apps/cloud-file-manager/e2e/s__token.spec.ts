import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

test.describe('/s/:token (public share)', () => {
  test('a non-existent token shows the not-found error and exposes no file metadata', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/s/aaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    await expect(page.locator('[data-mol-id="share-public-error"]')).toBeVisible({ timeout: 8000 })
  })

  test('a valid token resolves to file metadata that anyone (no cookie) can see', async ({
    page,
    browser,
  }) => {
    // Set up owner + file using the page fixture (gets video recording).
    await signup(page)
    const upload = await apiUpload(page, 'public-art.txt', 'visible to the world', 'text/plain')
    const file = await apiCreateFileRow(page, {
      name: 'public-art.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })

    const share = await page.evaluate(async (id) => {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file_id: id, permission: 'view' }),
        credentials: 'include',
      })
      return await res.json()
    }, file.id)
    const token = (share as { token: string }).token
    expect(token).toBeTruthy()

    // Open in a fresh context with no auth cookie — the share link must
    // be world-readable without a session.
    const anonCtx = await browser.newContext()
    const anon = await anonCtx.newPage()
    await anon.goto(APP_BASE + `/s/${token}`)
    await expect(
      anon.getByRole('heading', { name: /A file has been shared with you/i }),
    ).toBeVisible()
    await expect(anon.locator(`[data-mol-id="share-public-file-${file.id}"]`)).toBeVisible()
    await expect(anon.locator('[data-mol-id="share-public-download"]')).toHaveAttribute(
      'href',
      new RegExp(`/api/shares/public/${token}/download`),
    )
    await anonCtx.close()
  })

  test('the public download endpoint streams the original bytes anonymously', async ({
    page,
    request,
  }) => {
    await signup(page)
    const upload = await apiUpload(page, 'public-bytes.txt', 'shared bytes content', 'text/plain')
    const file = await apiCreateFileRow(page, {
      name: 'public-bytes.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    const share = await page.evaluate(async (id) => {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file_id: id, permission: 'view' }),
        credentials: 'include',
      })
      return await res.json()
    }, file.id)
    const token = (share as { token: string }).token

    const apiUrl = `http://localhost:${process.env.API_PORT || '4020'}`
    const dl = await request.get(`${apiUrl}/api/shares/public/${token}/download`)
    expect(dl.status()).toBe(200)
    expect(await dl.text()).toBe('shared bytes content')
  })

  test('"Back to Nimbus home" link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/s/x')
    await page.locator('[data-mol-id="share-public-home-link"]').click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })

  test('loading indicator appears while metadata is resolving', async ({ page, browser }) => {
    // Owner: set up file + share using the page fixture (gets video recording).
    await signup(page)
    const upload = await apiUpload(page, 'loading.txt', 'load bytes')
    const file = await apiCreateFileRow(page, {
      name: 'loading.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    const share = await page.evaluate(async (id) => {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file_id: id, permission: 'view' }),
        credentials: 'include',
      })
      return await res.json()
    }, file.id)
    const token = (share as { token: string }).token

    // Anonymous visitor in a separate context.
    const anonCtx = await browser.newContext()
    const anon = await anonCtx.newPage()
    const reqs = await captureNetwork(anon, async () => {
      await anon.goto(APP_BASE + `/s/${token}`)
      await expect(
        anon.getByRole('heading', { name: /A file has been shared with you/i }),
      ).toBeVisible({ timeout: 8000 })
    })
    expect(reqs.some((r) => /\/api\/shares\/public\//.test(r.url) && r.status === 200)).toBeTruthy()
    await anonCtx.close()
  })

  test('the share-public file panel renders mime + size metadata', async ({ page, browser }) => {
    // Owner: set up file + share using the page fixture (gets video recording).
    await signup(page)
    const upload = await apiUpload(page, 'meta.txt', 'meta bytes')
    const file = await apiCreateFileRow(page, {
      name: 'meta.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    const share = await page.evaluate(async (id) => {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file_id: id, permission: 'view' }),
        credentials: 'include',
      })
      return await res.json()
    }, file.id)
    const token = (share as { token: string }).token

    // Anonymous visitor in a separate context.
    const anonCtx = await browser.newContext()
    const anon = await anonCtx.newPage()
    await anon.goto(APP_BASE + `/s/${token}`)
    await expect(anon.locator(`[data-mol-id="share-public-file-${file.id}"]`)).toBeVisible({
      timeout: 8000,
    })
    const text = (
      await anon.locator(`[data-mol-id="share-public-file-${file.id}"]`).innerText()
    ).toLowerCase()
    expect(text).toContain('text/plain')
    await anonCtx.close()
  })
})
