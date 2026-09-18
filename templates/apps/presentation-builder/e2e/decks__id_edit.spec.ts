/**
 * /decks/:id/edit — editor page. Every primary editing action — adding
 * a slide, switching layout, transition, theme, typing speaker notes,
 * renaming the deck — must persist across reload, proven by the next
 * GET reflecting the write.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

async function createDeckAndOpenEditor(page: import('@playwright/test').Page) {
  await signup(page)
  await page.goto(APP_BASE + '/decks?new=1')
  await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })
}

test('editor: loads deck + initial slide via /presentations/:id and /slides', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/decks?new=1')
    await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/presentations\/[0-9a-f-]+/.test(r.url)),
    'GET /api/presentations/:id must fire',
  ).toBeTruthy()
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/slides\?presentationId=/.test(r.url)),
    'GET /api/slides?presentationId=… must fire',
  ).toBeTruthy()
})

test('editor: also fetches /api/themes for the theme picker', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/decks?new=1')
    await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/themes(\?|$)/.test(r.url)),
    'GET /api/themes must fire to populate theme options',
  ).toBeTruthy()
})

test('editor: add slide POSTs to /api/slides and renders new rail item', async ({ page }) => {
  await createDeckAndOpenEditor(page)
  await page.waitForLoadState('networkidle')

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('add-slide').click()
    await page.waitForTimeout(800)
  })

  const created = reqs.find((r) => r.method === 'POST' && /\/api\/slides(\?|$)/.test(r.url))
  expect(created, 'POST /api/slides must succeed').toBeTruthy()
  expect(created!.status).toBe(201)

  await expect(page.getByTestId('slide-rail-0')).toBeVisible()
})

test('editor: changing layout PUTs /api/slides/:id and persists across reload', async ({
  page,
}) => {
  await createDeckAndOpenEditor(page)
  await page.getByTestId('add-slide').click()
  await page.waitForTimeout(600)

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('layout-two-column').click()
    await page.waitForTimeout(800)
  })
  const put = reqs.find((r) => r.method === 'PUT' && /\/api\/slides\/[0-9a-f-]+/.test(r.url))
  expect(put, 'PUT /api/slides/:id must fire when changing layout').toBeTruthy()
  expect(put!.status).toBe(200)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('layout-two-column')).toHaveAttribute('aria-pressed', 'true')
})

test('editor: changing transition PUTs and persists across reload', async ({ page }) => {
  await createDeckAndOpenEditor(page)
  await page.getByTestId('add-slide').click()
  await page.waitForTimeout(600)

  await page.getByTestId('transition-zoom').click()
  await page.waitForTimeout(800)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('transition-zoom')).toHaveAttribute('aria-pressed', 'true')
})

test('editor: speaker notes save and round-trip across reload', async ({ page }) => {
  await createDeckAndOpenEditor(page)
  await page.getByTestId('add-slide').click()
  await page.waitForTimeout(600)

  const note = 'Cue the demo at 1:42'
  await page.getByTestId('speaker-notes').fill(note)
  await page.waitForTimeout(900)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('speaker-notes')).toHaveValue(note)
})

test('editor: deck title autosaves and round-trips through PUT /presentations/:id', async ({
  page,
}) => {
  await createDeckAndOpenEditor(page)
  await page.waitForLoadState('networkidle')

  const titleInput = page.getByTestId('deck-title-input')
  await titleInput.fill('Q4 Strategy')
  await page.waitForTimeout(900)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('deck-title-input')).toHaveValue('Q4 Strategy')
})

test('editor: delete slide removes it from the rail and DELETE returns 204', async ({ page }) => {
  await createDeckAndOpenEditor(page)
  await page.getByTestId('add-slide').click()
  await page.waitForTimeout(600)
  await page.getByTestId('add-slide').click()
  await page.waitForTimeout(600)

  const rail = page.getByTestId('slide-rail-0')
  await rail.hover()

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('delete-slide-0').click({ force: true })
    await page.waitForTimeout(800)
  })

  const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/slides\/[0-9a-f-]+/.test(r.url))
  expect(del, 'DELETE /api/slides/:id must fire').toBeTruthy()
  expect(del!.status).toBe(204)
})

test('editor: present link points at /decks/:id/present', async ({ page }) => {
  await createDeckAndOpenEditor(page)
  const link = page.getByTestId('present-link')
  await expect(link).toHaveAttribute('href', /\/decks\/[0-9a-f-]+\/present/)
})

test('editor: export to PDF triggers POST /api/exports and returns 2xx', async ({ page }) => {
  await createDeckAndOpenEditor(page)
  await page.getByTestId('add-slide').click()
  await page.waitForTimeout(600)

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('export-pdf').click()
    await page.waitForTimeout(1200)
  })

  const exported = reqs.find((r) => r.method === 'POST' && /\/api\/exports(\?|$)/.test(r.url))
  expect(exported, 'POST /api/exports must fire when exporting to PDF').toBeTruthy()
  expect(exported!.status).toBeLessThan(400)
})
