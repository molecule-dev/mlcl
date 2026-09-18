import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /meetings. Lists every meeting the caller owns,
 * sorted by recorded_at desc. Each row links to /meetings/:id.
 */

async function getAccessToken(email: string, password: string): Promise<string> {
  const res = await fetch(API_BASE + '/users/log-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`log-in failed: ${res.status}`)
  return ((await res.json()) as { accessToken: string }).accessToken
}

async function createMeeting(
  token: string,
  body: Record<string, unknown>,
): Promise<{ id: string }> {
  const res = await fetch(API_BASE + '/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  expect(res.status, await res.clone().text()).toBe(201)
  return (await res.json()) as { id: string }
}

test.describe('meetings page', () => {
  test('meetings heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('m-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/meetings')
    await expect(page.getByRole('heading', { name: /^meetings$/i }).first()).toBeVisible()
  })

  test('Record meeting link navigates to /record', async ({ page }) => {
    await signup(page, uniqueEmail('m-rec'), 'TestPass123!')
    await page.goto(APP_BASE + '/meetings')
    await page
      .getByRole('link', { name: /record meeting/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/record/)
  })

  test('empty state is shown to a fresh user', async ({ page }) => {
    await signup(page, uniqueEmail('m-empty'), 'TestPass123!')
    await page.goto(APP_BASE + '/meetings')
    await expect(page.getByText(/no meetings yet/i).first()).toBeVisible()
  })

  test('after seeding a meeting, a row links to /meetings/:id (read-after-write)', async ({
    page,
  }) => {
    const email = uniqueEmail('m-row')
    await signup(page, email, 'TestPass123!')
    const token = await getAccessToken(email, 'TestPass123!')
    const m = await createMeeting(token, {
      title: 'Spec-seeded standup',
      source: 'recorded',
      duration_minutes: 8,
      attendees: ['alice@example.com'],
    })

    await page.goto(APP_BASE + '/meetings')
    await expect(page.getByRole('link', { name: /Spec-seeded standup/i }).first()).toBeVisible()
    const link = page.locator(`a[href*="/meetings/${m.id}"]`).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/meetings/${m.id}`))
  })

  test('GET /api/meetings fires on page load (network capture)', async ({ page }) => {
    await signup(page, uniqueEmail('m-net'), 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/meetings')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find((r) => /\/api\/meetings(\?|$)/.test(r.url) && r.method === 'GET')
    expect(getCall, 'GET /api/meetings must fire on list page').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-record chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('m-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/meetings')
    await expect(page.locator('[data-mol-id="nav-record"]').first()).toBeVisible()
  })
})
