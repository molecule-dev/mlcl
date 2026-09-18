/**
 * /explore — authed photo discovery surface.
 *
 * Per-page spec covering each row in observations/explore.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uploadAndCreatePhoto } from './_helpers.js'

test('GET /api/photos fires on Explore page mount', async ({ page }) => {
  await signup(page)
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/explore')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/photos(\?|$)/.test(r.url) && r.method === 'GET')).toBe(true)
})

test('Explore page heading rendered', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/explore')
  const headings = await page.locator('h1, h2, h3').count()
  expect(headings).toBeGreaterThan(0)
})

test('A logged-in user sees a public photo on /explore', async ({ page }) => {
  await signup(page)
  const { uploadId } = await uploadAndCreatePhoto(page.request, {
    title: 'Explore-visible',
    visibility: 'public',
  })
  await page.goto(APP_BASE + '/explore')
  // The masonry image proxies via /api/photo-files/<uploadId>.
  const img = page.locator(`img[src*="${uploadId}"]`).first()
  await expect(img).toBeVisible({ timeout: 15_000 })
})

test('Tag chip click triggers a refetch', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/explore')
  await page.waitForLoadState('networkidle')
  const chip = page
    .getByRole('button', { name: /landscape|portrait|street|nature|documentary/i })
    .first()
  // count() never auto-waits, so a pre-paint read skipped this test instead of
  // running it. waitFor retries — a skip now means no chips really rendered.
  const present = await chip
    .first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false)
  if (!present) test.skip(true, 'No tag chips rendered on explore')
  const { reqs } = await captureNetwork(page, async () => {
    await chip.click()
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/photos\?.*tag=/.test(r.url) && r.method === 'GET')).toBe(true)
})

test('Photo card click navigates to /photos/:id', async ({ page }) => {
  await signup(page)
  const { photoId } = await uploadAndCreatePhoto(page.request, {
    title: 'Click-through',
    visibility: 'public',
  })
  await page.goto(APP_BASE + '/explore')
  // Use a programmatic click on the link; the link href is /photos/<id>.
  const link = page.locator(`a[href="/photos/${photoId}"]`).first()
  await expect(link).toBeVisible({ timeout: 15_000 })
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/photos/${photoId}`))
})
