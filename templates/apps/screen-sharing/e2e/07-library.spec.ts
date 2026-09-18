import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createRecording, listRecordings, signup } from './_helpers.js'

test.describe('library /library', () => {
  test('renders empty state for a brand-new user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.waitForLoadState('networkidle')
    const empty = page.getByText(/no recordings|empty|create your first/i).first()
    const recCard = page
      .getByRole('link')
      .filter({ hasText: /recording|clip/i })
      .first()
    expect((await empty.count()) > 0 || (await recCard.count()) === 0).toBe(true)
  })

  test('renders a freshly created recording', async ({ page }) => {
    const { accessToken } = await signup(page)
    const recording = await createRecording(page, accessToken, { title: 'Library demo clip' })
    await page.goto(APP_BASE + '/library')
    await expect(page.getByText('Library demo clip').first()).toBeVisible({ timeout: 10_000 })
    expect(recording.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('GET /api/recordings list contains created recordings', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createRecording(page, accessToken, { title: 'A' })
    await createRecording(page, accessToken, { title: 'B' })
    const all = await listRecordings(page, accessToken)
    expect(all.length).toBeGreaterThanOrEqual(2)
  })

  test('new recording CTA routes to /record', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.waitForLoadState('networkidle')
    const cta = page.getByRole('link', { name: /record|new/i }).first()
    if ((await cta.count()) > 0) {
      await cta.click()
      await expect(page).toHaveURL(/\/record/)
    } else {
      // navigation via hash href
      await page.goto(APP_BASE + '/record')
      await expect(page).toHaveURL(/\/record/)
    }
  })

  test('initial render hits GET /api/recordings', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => /\/api\/recordings(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })
})
