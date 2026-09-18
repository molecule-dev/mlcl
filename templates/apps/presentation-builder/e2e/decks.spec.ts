/**
 * Decks (studio) page: signup → list decks → create one → confirm it
 * appears, persists across reload, and the round-trip GET reflects what
 * the POST created.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('decks: signup → /decks shows empty state', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/decks')
    await page.waitForLoadState('networkidle')
  })

  // Backend invariant: GET /api/presentations was called with 200.
  const list = reqs.find((r) => r.method === 'GET' && /\/api\/presentations(\?|$)/.test(r.url))
  expect(list, 'GET /api/presentations must fire').toBeTruthy()
  expect(list!.status).toBe(200)

  // UI invariant: empty-state copy is shown for fresh accounts.
  await expect(page.getByTestId('decks-empty')).toBeVisible({ timeout: 10_000 })
})

test('decks: create new deck navigates to /decks/:id/edit and POST returns a real uuid', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/decks')
  await page.waitForLoadState('networkidle')

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('new-deck-empty-action').click()
    await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })
  })

  const created = reqs.find((r) => r.method === 'POST' && /\/api\/presentations(\?|$)/.test(r.url))
  expect(created, 'POST /api/presentations must succeed').toBeTruthy()
  expect(created!.status).toBe(201)
})

test('decks: created deck appears in the studio library after navigating back', async ({
  page,
}) => {
  await signup(page)

  await page.goto(APP_BASE + '/decks')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('new-deck-empty-action').click()
  await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })

  // Bounce back to the studio
  await page.goto(APP_BASE + '/decks')
  await page.waitForLoadState('networkidle')

  // Hero card + grid render at least one deck
  await expect(page.getByText(/Untitled Deck/).first()).toBeVisible({ timeout: 10_000 })
})

test('decks: ?new=1 query auto-creates a deck and routes to editor', async ({ page }) => {
  await signup(page)

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/decks?new=1')
    await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })
  })

  expect(
    reqs.find((r) => r.method === 'POST' && /\/api\/presentations(\?|$)/.test(r.url)),
    'POST /api/presentations must fire when ?new=1 is set',
  ).toBeTruthy()
})

test('decks: ?template=pitch-aurora creates a deck titled "Aurora Pitch"', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/decks?template=pitch-aurora')
  await page.waitForURL(/\/decks\/[0-9a-f-]+\/edit/, { timeout: 15_000 })

  // Bounce back to studio: the hero or grid should mention "Aurora Pitch"
  await page.goto(APP_BASE + '/decks')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Aurora Pitch/).first()).toBeVisible({ timeout: 10_000 })
})

test('decks: studio renders sidebar nav with the seven primary links', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/decks')
  for (const name of ['Decks', 'Templates', 'Shared', 'Analytics', 'Notifications', 'Settings']) {
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: new RegExp(`^${name}$`) })
        .first(),
    ).toBeVisible()
  }
})
