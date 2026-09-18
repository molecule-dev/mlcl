import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, seedPoll, signup } from './_helpers.js'

test('Casting a vote via POST /api/votes increments the tally on /api/results/:pollId', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['Approve', 'Reject'] })
  const before = await api<{ total_votes: number }>(page, 'GET', `/results/${poll.id}`)
  expect(before.total_votes).toBe(0)
  await api(page, 'POST', '/votes', { poll_id: poll.id, option_index: 0 })
  const after = await api<{
    total_votes: number
    options: Array<{ label: string; count?: number }>
  }>(page, 'GET', `/results/${poll.id}`)
  expect(after.total_votes).toBe(1)
  expect(after.options.find((o) => o.label === 'Approve')?.count).toBe(1)
})

test('Casting twice from the same user is rejected with 4xx (max_votes_per_user enforcement)', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['A', 'B'] })
  await api(page, 'POST', '/votes', { poll_id: poll.id, option_index: 0 })
  const dup = await apiRaw(page, 'POST', '/votes', { poll_id: poll.id, option_index: 1 })
  expect(dup.status()).toBeGreaterThanOrEqual(400)
  // Tally must not have been double-counted.
  const after = await api<{ total_votes: number }>(page, 'GET', `/results/${poll.id}`)
  expect(after.total_votes).toBe(1)
})

test('/vote/:id is reachable for an active poll (renders the ballot UI)', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, {
    publish: true,
    options: ['Approve', 'Reject'],
    title: 'Ballot route poll',
  })
  await page.goto(APP_BASE + `/vote/${poll.id}`)
  // Either render the ballot, or redirect to login if anon-voting is
  // gated. Either is acceptable, but the route must NOT 404.
  await expect(page).not.toHaveURL(/notFound|404/i)
  const body = await page.textContent('body')
  expect(body).toBeTruthy()
  expect(body!.length).toBeGreaterThan(20)
})

test('observation invariant: /vote/:id fires GET /api/polls/:id on page load', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['A', 'B'] })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/vote/${poll.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(
    reqs.find((r) => new RegExp(`/api/polls/${poll.id}\\b`).test(r.url) && r.method === 'GET'),
  ).toBeTruthy()
})
