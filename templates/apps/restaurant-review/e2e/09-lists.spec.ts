/**
 * Lists — /lists shows the user's lists alongside trending public lists,
 * and the "Create list" CTA persists a new list to /api/lists.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test('A new account starts with no personal lists but trending lists may render', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/lists')
  await expect(page.locator('[data-testid="lists-yours-empty"]')).toBeVisible()
})

test('Creating a list via the modal persists to the backend and renders inline', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/lists')

  await page.locator('[data-testid="lists-new"]').click()
  const name = `Date Night ${Date.now()}`
  await page.locator('[data-testid="list-create-name"]').fill(name)
  await page
    .locator('[data-testid="list-create-description"]')
    .fill('Restaurants to try with my partner.')
  await page.locator('[data-testid="list-create-submit"]').click()

  await expect(page.locator('[data-testid="lists-yours"]')).toContainText(name, { timeout: 8000 })

  // Verify backend.
  const r = await apiRequest<{ data: Array<{ name: string }> }>(
    page,
    'GET',
    '/api/lists?scope=mine',
  )
  expect(r.status).toBe(200)
  expect(r.body.data.some((l) => l.name === name)).toBe(true)
})

test('Lists mount fires GET /api/lists?scope=mine and ?scope=public', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/lists')
    await page
      .locator('[data-testid="lists-yours-empty"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  })
  const mineCall = reqs.find(
    (r) => /\/api\/lists\?[^]*scope=mine/.test(r.url) && r.method === 'GET',
  )
  const publicCall = reqs.find(
    (r) => /\/api\/lists\?[^]*scope=public/.test(r.url) && r.method === 'GET',
  )
  expect(mineCall, 'GET /api/lists?scope=mine must fire on mount').toBeTruthy()
  expect(publicCall, 'GET /api/lists?scope=public must fire on mount').toBeTruthy()
})

test('Create-list modal exposes name + description inputs', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/lists')
  await page.locator('[data-testid="lists-new"]').click()
  await expect(page.locator('[data-testid="list-create-name"]')).toBeVisible()
  await expect(page.locator('[data-testid="list-create-description"]')).toBeVisible()
  await expect(page.locator('[data-testid="list-create-submit"]')).toBeVisible()
})

test('Public lists rail renders (may be empty for fresh DB)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/lists')
  // Wait for the async fetch to settle — one of the two must be present
  // (populated grid OR empty placeholder).
  await page
    .locator('[data-testid="lists-public"], [data-testid="lists-public-empty"]')
    .first()
    .waitFor({ timeout: 10000 })
  const populated = await page.locator('[data-testid="lists-public"]').count()
  const empty = await page.locator('[data-testid="lists-public-empty"]').count()
  expect(populated + empty).toBeGreaterThan(0)
})

test('Lists eyebrow + heading are reachable at the top of the page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/lists')
  await expect(page.getByRole('heading').first()).toBeVisible()
})
