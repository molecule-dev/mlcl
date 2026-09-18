/**
 * /tags page — derived-tag index. Outcome asserted: page mounts without
 * console errors, exercises the workspace + pages endpoints, renders the
 * empty-state card for fresh accounts, and surfaces the right rows once a
 * page title contains a #hashtag.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test('tags page mounts without console errors', async ({ page }) => {
  await signup(page)
  await expectNoConsoleErrors(page, async () => {
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
  })
})

test('tags page renders a heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/tags')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('tags page is reachable directly via /tags', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/tags')
  await expect(page).toHaveURL(/\/tags/)
})

test('tags page exercises /api/workspaces and /api/pages', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find(
      (r) => r.method === 'GET' && /\/api\/workspaces($|\?)/.test(r.url) && r.status === 200,
    ),
  ).toBeTruthy()
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/pages($|\?)/.test(r.url) && r.status === 200),
  ).toBeTruthy()
})

test('tags page shows empty-state for fresh accounts', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/tags')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('tags-empty')).toBeVisible()
})

test('tags page empty-state "Go to notes" link navigates to /notes', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/tags')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('tags-empty').getByRole('link', { name: /notes/i }).click()
  await expect(page).toHaveURL(/\/notes/)
})

test('tags page derives a tag from a #hashtag in a note title', async ({ page }) => {
  await signup(page)
  // Seed a page with a hashtag in its title.
  await page.goto(APP_BASE + '/notes')
  await page.getByTestId('new-note').click()
  await page.waitForURL(/\/notes\/[0-9a-f-]+$/, { timeout: 15_000 })
  await page.getByTestId('note-title').fill('Watchlist #booksforlife')
  await page.waitForTimeout(1500)

  await page.goto(APP_BASE + '/tags')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('tags-table')).toBeVisible()
  await expect(page.getByText(/booksforlife/i)).toBeVisible()
})

test('tags page sidebar nav exposes all 6 primary links', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/tags')
  for (const name of ['Home', 'Notes', 'Search', 'Graph', 'Tags', 'Settings']) {
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: new RegExp(`^${name}$`) })
        .first(),
    ).toBeVisible()
  }
})

test('tags page user-menu button is reachable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/tags')
  await expect(page.getByRole('button', { name: /open user menu/i }).first()).toBeVisible()
})
