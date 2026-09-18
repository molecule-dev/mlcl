/**
 * /albums — list of the signed-in user's albums.
 *
 * Per-page spec covering each row in observations/albums.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test('"New album" button opens the create-album dialog', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/albums')
  await page
    .getByRole('button', { name: /new album/i })
    .first()
    .click()
  // The dialog must render BOTH a heading and the title input. Assert each
  // independently to avoid `or()`-driven strict-mode ambiguity.
  await expect(
    page.getByRole('heading', { name: /new album|create.*album|start.*album/i }).first(),
  ).toBeVisible()
  await expect(page.getByTestId('albums-new-title-input')).toBeVisible()
})

test('Album-title input accepts text in the dialog', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/albums')
  await page
    .getByRole('button', { name: /new album/i })
    .first()
    .click()
  await page.locator('input').first().fill('A test album')
  await expect(page.locator('input').first()).toHaveValue('A test album')
})

test('Album-description textarea accepts text', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/albums')
  await page
    .getByRole('button', { name: /new album/i })
    .first()
    .click()
  await page.locator('textarea').first().fill('Description goes here.')
  await expect(page.locator('textarea').first()).toHaveValue('Description goes here.')
})

test('Submit creates an album → POST /api/albums → list reflects it', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/albums')
  await page
    .getByRole('button', { name: /new album/i })
    .first()
    .click()
  const title = `Album-UI-${Date.now()}`
  await page.locator('input').first().fill(title)
  const { reqs } = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /create|save|submit/i })
      .last()
      .click()
    await page.waitForLoadState('networkidle')
  })
  const create = reqs.find((r) => /\/api\/albums(\?|$)/.test(r.url) && r.method === 'POST')
  expect(create, 'POST /api/albums should fire on submit').toBeTruthy()
  expect(create!.status).toBeLessThan(300)
  const list = await page.request.get(`${API_BASE}/albums?owner=me`)
  const arr = (await list.json()) as { title: string }[]
  expect(arr.some((a) => a.title === title)).toBe(true)
})

test('Album card → /albums/:id', async ({ page }) => {
  await signup(page)
  const created = await page.request.post(`${API_BASE}/albums`, {
    data: { title: `Card-target-${Date.now()}`, visibility: 'public' },
    headers: { 'content-type': 'application/json' },
  })
  const { id } = (await created.json()) as { id: string }
  await page.goto(APP_BASE + '/albums')
  await page.locator(`a[href="/albums/${id}"]`).first().click()
  await expect(page).toHaveURL(new RegExp(`/albums/${id}`))
})

test('Upload link nav → /upload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/albums')
  await page.locator('a[href="/upload"]').first().click()
  await expect(page).toHaveURL(/\/upload/)
})
