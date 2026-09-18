/**
 * /upload — file picker → two-stage upload pipeline.
 *
 * Per-page spec covering each row in observations/upload.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, FIXTURE_JPEG, signup } from './_helpers.js'

test('Title input accepts text', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/upload')
  await page.getByTestId('upload-title').fill('A new title')
  await expect(page.getByTestId('upload-title')).toHaveValue('A new title')
})

test('Tags input accepts text', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/upload')
  await page.getByTestId('upload-tags').fill('one,two,three')
  await expect(page.getByTestId('upload-tags')).toHaveValue('one,two,three')
})

test('?album_id=<id> preselects the album select', async ({ page }) => {
  await signup(page)
  const album = await page.request.post(`${API_BASE}/albums`, {
    data: { title: `Pre-${Date.now()}`, visibility: 'public' },
    headers: { 'content-type': 'application/json' },
  })
  const { id } = (await album.json()) as { id: string }
  await page.goto(`${APP_BASE}/upload?album_id=${id}`)
  await expect(page.getByTestId('upload-album-select')).toHaveValue(id)
})

test('Pick file → POST /api/photo-uploads + POST /api/photos → row marked done', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/upload')
  await page.getByTestId('upload-title').fill('UI Upload Title')
  await page.getByTestId('upload-tags').fill('ui,sample')
  const { reqs } = await captureNetwork(page, async () => {
    await page.getByTestId('upload-input').setInputFiles(FIXTURE_JPEG)
    await page.waitForFunction(
      () => document.querySelector('[data-testid="upload-row-done"]') !== null,
      { timeout: 30_000 },
    )
  })
  const upload = reqs.find((r) => /\/api\/photo-uploads/.test(r.url) && r.method === 'POST')
  const photo = reqs.find((r) => /\/api\/photos(\?|$)/.test(r.url) && r.method === 'POST')
  expect(upload, 'POST /api/photo-uploads should fire').toBeTruthy()
  expect(upload!.status).toBe(201)
  expect(photo, 'POST /api/photos should fire after upload completes').toBeTruthy()
  expect(photo!.status).toBeLessThan(300)
})

test('Upload-row-done element appears after a successful upload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/upload')
  await page.getByTestId('upload-title').fill('Done-row test')
  await page.getByTestId('upload-input').setInputFiles(FIXTURE_JPEG)
  await expect(page.getByTestId('upload-row-done')).toBeVisible({ timeout: 30_000 })
})

test('Upload page heading rendered', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/upload')
  expect(await page.locator('h1, h2, h3').count()).toBeGreaterThan(0)
})
