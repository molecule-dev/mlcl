import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  getLeaders,
  getStandings,
  signup,
  surnameOf,
} from './_helpers.js'

test('Dashboard renders the League Dashboard heading', async ({ page }) => {
  await signup(page)
  await expect(page.getByRole('heading', { name: /league dashboard/i })).toBeVisible()
})

test('Dashboard renders the API standings leader — not the FALLBACK static text', async ({
  page,
}) => {
  await signup(page)
  // Which team leads is read from the API. The page carries a static FALLBACK
  // set, so asserting the API's own leader is what proves the wiring on any
  // league, and it keeps holding once the demo teams are replaced.
  const rows = await getStandings(page.request)
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByRole('heading', { name: rows[0].name }).first()).toBeVisible({
    timeout: 15_000,
  })
})

test('Dashboard scoring leaders panel shows the API top scorer', async ({ page }) => {
  await signup(page)
  const leaders = await getLeaders(page.request, 'scoring')
  await page.goto(APP_BASE + '/dashboard')
  // A compact panel may abbreviate the first name ("D. Lastname"), so match on
  // the surname, which both renderings carry.
  await expect(page.getByText(surnameOf(leaders[0].name)).first()).toBeVisible({
    timeout: 15_000,
  })
})

test('observation invariant: /dashboard fires GET /scores/live + GET /standings + GET /stats/leaders', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(
    reqs.find((r) => /\/api\/scores\/live/.test(r.url) && r.method === 'GET'),
    'GET /api/scores/live',
  ).toBeTruthy()
  expect(
    reqs.find((r) => /\/api\/standings/.test(r.url) && r.method === 'GET'),
    'GET /api/standings',
  ).toBeTruthy()
  expect(
    reqs.find((r) => /\/api\/stats\/leaders\//.test(r.url) && r.method === 'GET'),
    'GET /api/stats/leaders/*',
  ).toBeTruthy()
})
