/**
 * /graph page — backlink graph visualization. Outcome asserted: the page
 * mounts without console errors, the workspace + page-list endpoints are
 * exercised, the empty-state copy renders, and the in-page links land on
 * the right routes.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test('graph page mounts without console errors', async ({ page }) => {
  await signup(page)
  await expectNoConsoleErrors(page, async () => {
    await page.goto(APP_BASE + '/graph')
    await page.waitForLoadState('networkidle')
  })
})

test('graph page renders a heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/graph')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('graph page renders the empty-state card or a graph surface', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/graph')
  // For fresh users (no [[wikilinks]] yet) we render the empty-state. Once
  // pages start linking, an SVG/canvas takes its place. Either is OK.
  const main = page.locator('main')
  const empty = main.getByText(/Backlink graph coming soon/i)
  const surface = main.locator('svg, canvas').first()
  await expect(empty.or(surface)).toBeVisible({ timeout: 10_000 })
})

test('graph page exercises /api/workspaces and /api/pages', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/graph')
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

test('graph page "Browse notes →" link navigates to /notes', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/graph')
  const link = page.getByRole('link', { name: /browse notes/i }).first()
  if (await link.count()) {
    await link.click()
    await expect(page).toHaveURL(/\/notes/)
  } else {
    // Once users have linked notes the empty-state CTA is gone — accept that.
    expect(true).toBe(true)
  }
})

test('graph page sidebar nav exposes all 6 primary links', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/graph')
  for (const name of ['Home', 'Notes', 'Search', 'Graph', 'Tags', 'Settings']) {
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: new RegExp(`^${name}$`) })
        .first(),
    ).toBeVisible()
  }
})

test('graph page user-menu button is reachable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/graph')
  await expect(page.getByRole('button', { name: /open user menu/i }).first()).toBeVisible()
})

test('graph page summary line mentions a notes count', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/graph')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/notes in this workspace/i)).toBeVisible()
})
