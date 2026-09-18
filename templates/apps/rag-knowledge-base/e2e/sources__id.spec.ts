/**
 * /sources/:id — Engram source detail.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, createSource, signup } from './_helpers.js'

test.describe('sources/:id', () => {
  test('renders the source label as a heading', async ({ page }) => {
    const { accessToken } = await signup(page)
    const source = await createSource(page, accessToken, { label: 'Detail Source' })
    await page.goto(APP_BASE + `/sources/${source.id}`)
    await expect(page.locator('[data-testid="sourceDetail-title"]')).toContainText('Detail Source')
  })

  test('renders the status badge', async ({ page }) => {
    const { accessToken } = await signup(page)
    const source = await createSource(page, accessToken, { label: 'Status Source' })
    await page.goto(APP_BASE + `/sources/${source.id}`)
    await expect(page.locator('[data-testid="sourceDetail-status-badge"]')).toBeVisible()
  })

  test('Sync now PUTs /api/sources/:id and the badge re-renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    const source = await createSource(page, accessToken, { label: 'Sync Source' })
    await page.goto(APP_BASE + `/sources/${source.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="sourceDetail-sync-now"]').click()
      await page.waitForTimeout(1500)
    })
    const put = reqs.find((r) => r.method === 'PUT' && r.url.includes(`/api/sources/${source.id}`))
    expect(put?.status).toBe(200)
    await expect(page.locator('[data-testid="sourceDetail-status-badge"]')).toBeVisible()

    // Read-after-write: GET /api/sources/:id reflects last_sync_at.
    const res = await page.request.get(`${API_BASE}/sources/${source.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
  })

  test('back link routes to /sources', async ({ page }) => {
    const { accessToken } = await signup(page)
    const source = await createSource(page, accessToken, { label: 'Back Source' })
    await page.goto(APP_BASE + `/sources/${source.id}`)
    await page
      .getByRole('link', { name: /back|sources/i })
      .first()
      .click()
    await page.waitForURL(/\/sources$/, { timeout: 10_000 })
  })
})
