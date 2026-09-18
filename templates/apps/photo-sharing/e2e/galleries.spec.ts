/**
 * /galleries — public-album editorial view.
 *
 * Per-page spec covering each row in observations/galleries.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uploadAndCreatePhoto } from './_helpers.js'

test('Galleries heading rendered', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/galleries')
  expect(await page.locator('h1, h2, h3').count()).toBeGreaterThan(0)
})

test('GET /api/galleries fires on Galleries page mount', async ({ page }) => {
  await signup(page)
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/galleries')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/galleries/.test(r.url) && r.method === 'GET')).toBe(true)
})

test('A new public album with photos appears as a gallery card linking to /albums/:id', async ({
  page,
}) => {
  await signup(page)
  const album = await page.request.post(`${API_BASE}/albums`, {
    data: { title: `Gallery-${Date.now()}`, visibility: 'public', description: 'Edit.' },
    headers: { 'content-type': 'application/json' },
  })
  const { id: albumId } = (await album.json()) as { id: string }
  await uploadAndCreatePhoto(page.request, {
    title: 'Gallery cover',
    albumId,
    visibility: 'public',
  })
  await page.goto(APP_BASE + '/galleries')
  await expect(
    page.getByTestId(`galleries-card-${albumId}`).or(page.getByTestId('galleries-featured-open')),
  ).toBeVisible({ timeout: 15_000 })
})

test('Gallery card click navigates to /albums/:id', async ({ page }) => {
  await signup(page)
  const album = await page.request.post(`${API_BASE}/albums`, {
    data: { title: `Click-${Date.now()}`, visibility: 'public' },
    headers: { 'content-type': 'application/json' },
  })
  const { id: albumId } = (await album.json()) as { id: string }
  await uploadAndCreatePhoto(page.request, { title: 'Cover', albumId, visibility: 'public' })
  await page.goto(APP_BASE + '/galleries')
  const link = page.locator(`a[href="/albums/${albumId}"]`).first()
  await expect(link).toBeVisible({ timeout: 15_000 })
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/albums/${albumId}`))
})
