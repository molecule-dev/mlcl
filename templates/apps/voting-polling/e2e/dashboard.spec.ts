import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listPolls, literal, seedPoll, signup } from './_helpers.js'

test('Dashboard renders the Quorum Control Room heading', async ({ page }) => {
  await signup(page)
  await expect(page.getByRole('heading', { name: /quorum control room/i })).toBeVisible()
})

test('Dashboard renders one card per poll the API returns', async ({ page }) => {
  await signup(page)
  // Read the polls under test from the same endpoint the page reads — the
  // starter ballots are demo content an app's owner replaces.
  const polls = await listPolls(page)
  expect(polls.length).toBeGreaterThan(0)

  const list = page.locator('[data-test="dashboard-poll-list"]')
  await expect(list).toBeVisible()
  await expect(list.getByRole('link')).toHaveCount(polls.length)
  for (const poll of polls) {
    await expect(list.getByRole('link', { name: literal(poll.title) })).toBeVisible()
  }
})

test('Dashboard "Total polls" KPI reflects the real /api/polls count (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  await expect(page.getByText(/Total polls/i)).toBeVisible()
  const before = await listPolls(page)
  // Every poll carries one of the app's lifecycle statuses (api/src/handlers/
  // polls.ts POLL_STATUSES) — app vocabulary, not demo content.
  for (const poll of before) {
    expect(['draft', 'active', 'closed'], JSON.stringify(poll)).toContain(poll.status)
  }
  const list = page.locator('[data-test="dashboard-poll-list"]')
  await expect(list.getByRole('link')).toHaveCount(before.length)

  // Read-after-write: a poll created through the API must show up as one more
  // card, which is what makes the count a real reflection of /api/polls.
  const created = await seedPoll(page, { publish: false })
  await page.goto(APP_BASE + '/dashboard')
  await expect(list.getByRole('link')).toHaveCount(before.length + 1)
  await expect(list.getByRole('link', { name: literal(created.title) })).toBeVisible()
})

test('Dashboard "create poll" CTA routes to /polls/new', async ({ page }) => {
  await signup(page)
  const cta = page.getByRole('link', { name: /create|new poll/i }).first()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL(/\/polls\/new/, { timeout: 10_000 })
})

test('observation invariant: /dashboard fires GET /api/polls and GET /api/results', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/polls\b/.test(r.url) && r.method === 'GET')).toBeTruthy()
  expect(reqs.find((r) => /\/api\/results\//.test(r.url) && r.method === 'GET')).toBeTruthy()
})
