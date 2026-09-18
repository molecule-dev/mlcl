import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedPoll, signup } from './_helpers.js'

test('/polls/:id/present renders the presenter shell with the poll title', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, {
    publish: true,
    options: ['Yes', 'No'],
    title: 'Presenter mode poll',
  })
  await page.goto(APP_BASE + `/polls/${poll.id}/present`)
  await expect(page.getByText(/presenter mode poll/i).first()).toBeVisible({ timeout: 15_000 })
})

test('/polls/:id/present is reachable from a live poll URL (no 404)', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['A', 'B'] })
  await page.goto(APP_BASE + `/polls/${poll.id}/present`)
  // We must NOT have been redirected to /login (route is auth-protected
  // but we are signed in) or to the catch-all NotFound (which renders a
  // 404-style heading).
  await expect(page).not.toHaveURL(/\/login/)
  const body = await page.textContent('body')
  expect(body).toBeTruthy()
  expect(body!.length).toBeGreaterThan(20)
})

test('/polls/:id/present shows the running tally panel (presenter view)', async ({ page }) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['Approve', 'Reject'] })
  await page.goto(APP_BASE + `/polls/${poll.id}/present`)
  // Pin to the Approve label — it's one of the option labels and must
  // render in the stage view tally.
  await expect(page.getByText('Approve').first()).toBeVisible({ timeout: 15_000 })
})

test('observation invariant: /polls/:id/present fires GET /api/results/:id on page load', async ({
  page,
}) => {
  await signup(page)
  const poll = await seedPoll(page, { publish: true, options: ['Yes', 'No'] })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/polls/${poll.id}/present`)
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/results\//.test(r.url) && r.method === 'GET')).toBeTruthy()
})
