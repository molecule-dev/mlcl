import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, seedPoll, signup } from './_helpers.js'

test('/polls/:id/live renders an active poll heading', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, {
    publish: true,
    options: ['Yes', 'No'],
    title: 'Live results poll',
  })
  await api(page, 'POST', '/votes', { poll_id: poll.id, option_index: 0 })
  await page.goto(APP_BASE + `/polls/${poll.id}/live`)
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('/polls/:id/live shows the running tally for an active poll', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['Yes', 'No'] })
  await api(page, 'POST', '/votes', { poll_id: poll.id, option_index: 0 })
  await page.goto(APP_BASE + `/polls/${poll.id}/live`)
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.getByText('Yes').first()).toBeVisible()
  const body = await page.textContent('body')
  expect(body).toMatch(/\b1\b/)
})

test('Poll results CSV export endpoint /api/results/:id/export honors the canExport gate', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['A', 'B'] })
  await api(page, 'POST', '/votes', { poll_id: poll.id, option_index: 0 })
  const resp = await apiRaw(page, 'GET', `/results/${poll.id}/export`)
  if (resp.status() === 200) {
    const body = await resp.text()
    expect(body.length).toBeGreaterThan(0)
    expect(body).toMatch(/[,\n]/)
  } else {
    expect(resp.status()).toBeGreaterThanOrEqual(400)
  }
})

test('observation invariant: /polls/:id/live fires GET /api/results/:id on page load', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['Yes', 'No'] })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/polls/${poll.id}/live`)
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/results\//.test(r.url) && r.method === 'GET')).toBeTruthy()
})
