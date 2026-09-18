import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, seedPoll, signup } from './_helpers.js'

test('Asking an audience question persists it under /api/audience_questions/poll/:id', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true })
  const before = await api<Array<{ id: string }>>(
    page,
    'GET',
    `/audience_questions/poll/${poll.id}`,
  )
  const beforeCount = before.length
  const created = await api<{ id: string; body: string; status: string }>(
    page,
    'POST',
    '/audience_questions',
    { poll_id: poll.id, body: 'How does the proposed amendment handle proxies?' },
  )
  expect(created.id).toBeTruthy()
  expect(created.status).toBe('pending')
  const after = await api<Array<{ id: string; body: string }>>(
    page,
    'GET',
    `/audience_questions/poll/${poll.id}`,
  )
  expect(after.length).toBe(beforeCount + 1)
  expect(after.find((q) => q.id === created.id)?.body).toMatch(/proxies/)
})

test('Upvoting a question increments its vote_count (read-after-write)', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true })
  const created = await api<{ id: string }>(page, 'POST', '/audience_questions', {
    poll_id: poll.id,
    body: 'Will quorum be raised?',
  })
  await api(page, 'POST', `/audience_questions/${created.id}/vote`, {})
  const list = await api<Array<{ id: string; vote_count: number }>>(
    page,
    'GET',
    `/audience_questions/poll/${poll.id}`,
  )
  const me = list.find((q) => q.id === created.id)
  expect(me?.vote_count).toBeGreaterThanOrEqual(1)
})

test('Promoting a question changes its status to "promoted" and persists it', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true })
  const created = await api<{ id: string }>(page, 'POST', '/audience_questions', {
    poll_id: poll.id,
    body: 'Why this charter?',
  })
  await api(page, 'PUT', `/audience_questions/${created.id}/status`, { status: 'promoted' })
  const list = await api<Array<{ id: string; status: string }>>(
    page,
    'GET',
    `/audience_questions/poll/${poll.id}`,
  )
  expect(list.find((q) => q.id === created.id)?.status).toBe('promoted')
})

test('/polls/:id/qa renders a question asked on that poll (live integration)', async ({ page }) => {
  await signup(page)
  // Create the poll and its question through the same endpoints the UI posts,
  // rather than hunting for a demo-seeded ballot an app's owner would replace.
  const poll = await seedPoll(page, { publish: true })
  const body = `Spec question ${Date.now()} — how are delegated proxies handled?`
  const created = await api<{ id: string }>(page, 'POST', '/audience_questions', {
    poll_id: poll.id,
    body,
  })

  await page.goto(APP_BASE + `/polls/${poll.id}/qa`)
  const row = page.locator(`[data-test="qa-row-${created.id}"]`)
  await expect(row).toBeVisible({ timeout: 15_000 })
  await expect(row).toContainText(body)
})

test('Audience question route is mounted at /api/audience_questions (regression)', async ({
  page,
}) => {
  // Regression for the underscore-vs-hyphen bug: the route must respond
  // at /api/audience_questions, not /api/audience-questions.
  await signup(page)
  const hyphen = await apiRaw(
    page,
    'GET',
    '/audience-questions/poll/00000000-0000-0000-0000-000000000000',
  )
  expect(hyphen.status(), 'hyphen route does not exist').toBe(404)
  const underscore = await apiRaw(
    page,
    'GET',
    '/audience_questions/poll/00000000-0000-0000-0000-000000000000',
  )
  expect(underscore.status(), 'underscore route IS the canonical path').toBeLessThan(500)
})

test('observation invariant: /polls/:id/qa fires GET /api/audience_questions/poll/:id on page load', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/polls/${poll.id}/qa`)
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(
    reqs.find((r) => /\/api\/audience_questions\/poll\//.test(r.url) && r.method === 'GET'),
  ).toBeTruthy()
})
