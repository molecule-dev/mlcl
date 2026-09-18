import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, seedPoll, signup } from './_helpers.js'

test('/polls/:id renders the canonical title (data-test="polldetail-title")', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, {
    publish: true,
    options: ['Coffee', 'Tea'],
    title: 'Reload-survives poll',
  })
  await page.goto(APP_BASE + `/polls/${poll.id}`)
  await expect(page.locator('[data-test="polldetail-title"]')).toHaveText(/reload-survives poll/i)
})

test('Publishing a draft poll moves it to "active" status and stamps start_date', async ({
  page,
}) => {
  await signup(page)
  const draft = await seedPoll(page, { publish: false, options: ['Yes', 'No', 'Abstain'] })
  expect(draft.status).toBe('draft')
  const published = await api<{ status: string; start_date: string | null }>(
    page,
    'POST',
    `/polls/${draft.id}/publish`,
  )
  expect(published.status).toBe('active')
  expect(published.start_date, 'publish stamps start_date').not.toBeNull()
})

test('Closing an active poll moves it to "closed" and stamps end_date (persists across reload)', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true })
  expect(poll.status).toBe('active')
  const closed = await api<{ status: string; end_date: string | null }>(
    page,
    'POST',
    `/polls/${poll.id}/close`,
  )
  expect(closed.status).toBe('closed')
  expect(closed.end_date).not.toBeNull()
  // Re-GET to confirm persistence.
  const after = await api<{ status: string }>(page, 'GET', `/polls/${poll.id}`)
  expect(after.status).toBe('closed')
})

test('observation invariant: /polls/:id fires GET /api/polls/:id on page load', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['A', 'B'] })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/polls/${poll.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(
    reqs.find((r) => new RegExp(`/api/polls/${poll.id}\\b`).test(r.url) && r.method === 'GET'),
  ).toBeTruthy()
})
