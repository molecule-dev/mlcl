/**
 * /sessions/:id — player by id-or-slug. Asserts hero render, transport
 * controls work, skip controls work, and completion writes to /api/history.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('session player (/sessions/:id)', () => {
  test('renders a real session by slug from /api/sessions/:id', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/sessions?limit=1`)
    const sessions = (await r.json()) as Array<{ slug: string; title: string }>
    expect(sessions.length).toBeGreaterThan(0)
    const session = sessions[0]

    await page.goto(APP_BASE + '/sessions/' + session.slug)
    await expect(page.getByRole('heading', { name: session.title })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole('heading', { name: /chapters/i })).toBeVisible()
  })

  test('player transport (play / pause toggle) is visible and clickable', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/sessions?limit=1`)
    const sessions = (await r.json()) as Array<{ slug: string }>
    expect(sessions.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/sessions/' + sessions[0].slug)
    const toggle = page.getByTestId('player-toggle')
    await expect(toggle).toBeVisible({ timeout: 10000 })
    await toggle.click()
    await page.waitForTimeout(300)
    await toggle.click()
  })

  test('skip controls (forward 30 / replay 10) are present and clickable', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/sessions?limit=1`)
    const sessions = (await r.json()) as Array<{ slug: string }>
    await page.goto(APP_BASE + '/sessions/' + sessions[0].slug)
    await expect(page.getByTestId('player-skip-forward')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('player-skip-forward').click()
  })

  test('skipping past the duration POSTs /api/history and a row is persisted', async ({ page }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/sessions?limit=1`)
    const sessions = (await list.json()) as Array<{
      id: string
      slug: string
      duration_seconds: number
    }>
    expect(sessions.length).toBeGreaterThan(0)
    const session = sessions[0]

    const before = await page.request.get(`${API_BASE}/history`, {
      headers: apiHeaders(accessToken),
    })
    const beforeRows = (await before.json()) as Array<unknown>

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/sessions/' + session.slug)
      await page.getByTestId('player-chapter-close').click()
      for (let i = 0; i < Math.ceil(session.duration_seconds / 30) + 2; i++) {
        await page.getByTestId('player-skip-forward').click()
      }
      await page.waitForTimeout(1500)
    })
    const historyPosts = reqs.filter(
      (r) => r.method === 'POST' && r.url.includes('/api/history') && r.status < 400,
    )
    expect(
      historyPosts.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)

    const after = await page.request.get(`${API_BASE}/history`, {
      headers: apiHeaders(accessToken),
    })
    const afterRows = (await after.json()) as Array<{ session_id: string }>
    expect(afterRows.length, 'history should grow by at least one row').toBeGreaterThan(
      beforeRows.length,
    )
    expect(afterRows.some((r) => r.session_id === session.id)).toBe(true)
  })
})
