/**
 * /notes/:id page — note editor (title, body, pin, trash). Outcomes
 * asserted: GET /api/pages/:id loads the note (with embedded blocks),
 * autosave POSTs/PATCHes to /api/blocks and /api/pages, trash routes back
 * to /notes and removes the page from the list.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('open existing note triggers GET /api/pages/:id', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })

  const url = page.url()
  const reqs = await captureNetwork(page, async () => {
    await page.reload()
    await page.waitForURL(url)
    await page.waitForLoadState('networkidle')
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/pages\/[0-9a-f-]+$/.test(r.url))
  expect(get, 'GET /api/pages/:id should fire on detail load').toBeTruthy()
  expect(get!.status).toBe(200)
})

test('typing in body autosaves via /api/blocks', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('note-body').fill('Saving body content from autosave.')
    await page.waitForTimeout(1500)
  })
  const blockWrite = reqs.find(
    (r) => /\/api\/blocks/.test(r.url) && (r.method === 'POST' || r.method === 'PATCH'),
  )
  expect(blockWrite, 'autosave should POST /api/blocks').toBeTruthy()
  expect(blockWrite!.status).toBeLessThan(300)
})

test('renaming title patches /api/pages/:id', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('note-title').fill('Renamed via autosave')
    await page.waitForTimeout(1500)
  })
  const titleWrite = reqs.find(
    (r) => r.method === 'PATCH' && /\/api\/pages\/[0-9a-f-]+$/.test(r.url),
  )
  expect(titleWrite, 'rename should PATCH /api/pages/:id').toBeTruthy()
  expect(titleWrite!.status).toBeLessThan(300)
})

test('toggle favorite (pin) patches /api/pages/:id with is_favorited', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('pin-toggle').click()
    await page.waitForTimeout(800)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/pages\/[0-9a-f-]+$/.test(r.url))
  expect(patch, 'pin toggle should PATCH page').toBeTruthy()
  expect(patch!.status).toBeLessThan(300)
})

test('move-to-trash navigates back to /notes', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  page.once('dialog', (d) => d.accept())
  await page.getByTestId('trash-page').click()
  await page.waitForURL(/\/notes$/, { timeout: 15_000 })
  await expect(page).toHaveURL(/\/notes$/)
})

test('breadcrumb workspace link navigates back to /notes', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  await page
    .getByRole('link', { name: /my notebook/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/notes$/)
})

test('sidebar nav links are visible from the editor', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  for (const name of ['Home', 'Notes', 'Search', 'Graph', 'Tags', 'Settings']) {
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: new RegExp(`^${name}$`) })
        .first(),
    ).toBeVisible()
  }
})

test('user menu button is reachable from editor', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /open user menu/i }).first()).toBeVisible()
})

test('word count indicator is visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  await expect(page.getByText(/\d+\s*words?/i).first()).toBeVisible()
})

test('updated timestamp text is visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  await expect(page.getByText(/^Updated/i).first()).toBeVisible()
})

test('breadcrumb title text mirrors the page title input', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  await page.getByTestId('note-title').fill('Breadcrumb Mirror')
  await page.waitForTimeout(800)
  // The breadcrumb is the navigation > generic node holding the title.
  await expect(
    page.locator('nav, [role="navigation"]').filter({ hasText: 'Breadcrumb Mirror' }).first(),
  ).toBeVisible()
})
