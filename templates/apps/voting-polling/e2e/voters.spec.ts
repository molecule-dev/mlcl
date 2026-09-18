import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, listVoters, signup } from './_helpers.js'

test('Voters page lists seeded voters and supports adding a new voter', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/voters')
  await expect(page.getByRole('heading', { name: /voter/i }).first()).toBeVisible()

  // Read-after-write: the seed pre-populates 3 sample voters; adding one
  // must increase the count.
  const before = await api<{ data: Array<{ id: string }> }>(page, 'GET', '/voters')
  const beforeCount = before.data.length

  const created = await api<{ id: string; email: string; name: string }>(page, 'POST', '/voters', {
    name: 'New Voter',
    email: `new-voter-${Date.now()}@example.org`,
    organization: 'Test Org',
    role: 'Member',
  })
  expect(created.id).toBeTruthy()

  const after = await api<{ data: Array<{ id: string }> }>(page, 'GET', '/voters')
  expect(after.data.length).toBe(beforeCount + 1)
  expect(after.data.find((v) => v.id === created.id)).toBeTruthy()
})

test('Updating a voter persists the new fields (read-after-write)', async ({ page }) => {
  await signup(page)
  const created = await api<{ id: string; name: string }>(page, 'POST', '/voters', {
    name: 'Original Name',
    email: `update-voter-${Date.now()}@example.org`,
  })
  const updated = await api<{ name: string; role: string | null }>(
    page,
    'PUT',
    `/voters/${created.id}`,
    { name: 'Updated Name', role: 'Chair' },
  )
  expect(updated.name).toBe('Updated Name')
  expect(updated.role).toBe('Chair')

  const fresh = await api<{ data: Array<{ id: string; name: string; role: string | null }> }>(
    page,
    'GET',
    '/voters',
  )
  const row = fresh.data.find((v) => v.id === created.id)
  expect(row?.name).toBe('Updated Name')
  expect(row?.role).toBe('Chair')
})

test('Deleting a voter removes them from the list', async ({ page }) => {
  await signup(page)
  const created = await api<{ id: string }>(page, 'POST', '/voters', {
    name: 'To Delete',
    email: `delete-voter-${Date.now()}@example.org`,
  })
  const resp = await apiRaw(page, 'DELETE', `/voters/${created.id}`)
  expect(resp.status()).toBeLessThan(300)
  const fresh = await api<{ data: Array<{ id: string }> }>(page, 'GET', '/voters')
  expect(fresh.data.find((v) => v.id === created.id)).toBeUndefined()
})

test('/voters page renders a row per voter on the roll', async ({ page }) => {
  await signup(page)
  // Read the roll from the same endpoint the page reads — the starter voters
  // are demo content an app's owner replaces.
  const voters = await listVoters(page)
  expect(voters.length).toBeGreaterThan(0)

  await page.goto(APP_BASE + '/voters')
  await expect(page.getByRole('heading', { name: /voter/i }).first()).toBeVisible()
  await expect(page.locator('[data-test="voters-table"]')).toBeVisible({ timeout: 15_000 })
  for (const voter of voters) {
    const row = page.locator(`[data-test="voter-row-${voter.id}"]`)
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row).toContainText(voter.name)
  }
})

test('GET /api/voters populates the roll on first call (idempotent on repeat)', async ({
  page,
}) => {
  await signup(page)
  // The demo seed runs on first GET /polls. Hit /polls first so the
  // workspace is populated, then list voters.
  await api(page, 'GET', '/polls')
  const first = await listVoters(page)
  expect(first.length).toBeGreaterThan(0)
  // A repeat call must not re-seed the roll.
  const second = await listVoters(page)
  expect(second.length).toBe(first.length)
})

test('observation invariant: /voters fires GET /api/voters on page load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/voters')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/voters\b/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
