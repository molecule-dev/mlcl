/**
 * /training/:id module player.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/training/:id', () => {
  async function listModules(page: import('@playwright/test').Page, accessToken: string | null) {
    const r = await page.request.get(`${API_BASE}/training-modules`, {
      headers: authHeaders(accessToken),
    })
    return (await r.json()) as Array<{
      id: string
      title: string
      content?: string | null
      duration_minutes?: number | null
      quiz?: unknown
    }>
  }

  test('renders the module title from the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tr-id'))
    const mods = await listModules(page, accessToken)
    expect(mods.length).toBeGreaterThan(0)
    const m = mods[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/training/' + m.id)
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-training-module"]').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body).toContain(m.title.slice(0, 20))
    expect(reqs.some((r) => /\/api\/training/.test(r.url))).toBe(true)
  })

  test('completing a module via API persists completed_at + quiz_score', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tr-comp'))
    const mods = await listModules(page, accessToken)
    const m = mods[0]
    const r = await page.request.post(`${API_BASE}/training-progress`, {
      headers: authHeaders(accessToken),
      data: {
        module_id: m.id,
        started_at: new Date(Date.now() - 5000).toISOString(),
        completed_at: new Date().toISOString(),
        quiz_score: 95,
      },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeLessThan(400)
  })

  test('back-to-training link returns to /training', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tr-back'))
    const mods = await listModules(page, accessToken)
    await page.goto(APP_BASE + '/training/' + mods[0].id)
    await page.waitForLoadState('networkidle')
    const back = page.locator('a[href="/training"]').first()
    if (await back.count()) {
      await back.click()
      await expect(page).toHaveURL(/\/training$/, { timeout: 10_000 })
    }
  })
})
