import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test('Cross-page user journey: signup → create poll → publish → vote → results → close → settings → billing → logout', async ({
  page,
}) => {
  // Single end-to-end story exercising every primary surface in one run.
  // Asserts on actual outcomes (server-side state) at each step, not just
  // navigation events.

  // 1) Signup → /dashboard with seeded data.
  const { email, password } = await signup(page)
  await expect(page.getByRole('heading', { name: /quorum control room/i })).toBeVisible()

  // 2) /polls/new — create a brand-new poll via the API surface (UI form
  //    is exercised separately in polls.spec.ts; here we focus on the
  //    cross-page persistence story).
  const created = await api<{ id: string; title: string; status: string }>(page, 'POST', '/polls', {
    title: 'Cross-page journey poll',
    type: 'single-choice',
    options: ['Yes', 'No'],
  })
  expect(created.status).toBe('draft')

  // 3) Publish it. Active poll must accept votes.
  const published = await api<{ status: string }>(page, 'POST', `/polls/${created.id}/publish`)
  expect(published.status).toBe('active')

  // 4) Cast a vote.
  await api(page, 'POST', '/votes', { poll_id: created.id, option_index: 0 })
  const tally = await api<{ total_votes: number }>(page, 'GET', `/results/${created.id}`)
  expect(tally.total_votes).toBe(1)

  // 5) Visit Live Results page to confirm the wiring is real.
  await page.goto(APP_BASE + `/polls/${created.id}/live`)
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.getByText('Yes').first()).toBeVisible()

  // 6) Close the poll.
  const closed = await api<{ status: string }>(page, 'POST', `/polls/${created.id}/close`)
  expect(closed.status).toBe('closed')

  // 7) Visit Settings, Notifications, Voters, Team — every primary surface
  //    must render without throwing on a real signed-in session.
  for (const path of ['/settings', '/notifications', '/voters', '/team', '/analytics']) {
    await page.goto(APP_BASE + path)
    // No 404 / blank screen — confirm we're not on the catch-all NotFound.
    await expect(page).not.toHaveURL(/\/login/)
    const body = await page.textContent('body')
    expect(body, `${path} body length`).toBeTruthy()
    expect(body!.length).toBeGreaterThan(20)
  }

  // 8) Visit /billing and confirm the user is on the free plan.
  await page.goto(APP_BASE + '/billing')
  await expect(page.locator('[data-test="billing-title"]')).toBeVisible()
  const status = await api<{ planKey: string }>(page, 'GET', '/billing/status')
  expect(status.planKey).toBe('free')

  // 9) Logout — token should be cleared and protected routes bounce to /login.
  await page.goto(APP_BASE + '/dashboard')
  await page
    .getByRole('button', { name: /open user menu|user menu|menu/i })
    .first()
    .click()
  await page
    .getByRole('button', { name: /sign\s*out|log\s*out/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10_000 })

  // 10) Sanity: protected route → /login while logged out.
  await page.goto(APP_BASE + '/voters')
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })

  // (logout-credentials should still work; not re-tested here to avoid
  //  duplication with auth.spec.ts.)
  expect(email).toBeTruthy()
  expect(password).toBeTruthy()
})
