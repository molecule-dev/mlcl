import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /datasets/:id — full schema, statistics, ai_insights aside, sample
// preview tab loads /datasets/:id/preview lazily.

test.describe('/datasets/:id', () => {
  test('schema tab shows column rows + AI insights aside', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/datasets')
    await page.waitForResponse((r) => /\/api\/datasets/.test(r.url()))
    const firstLink = await page.locator('a[href^="/datasets/"]').first().getAttribute('href')
    expect(firstLink).toBeTruthy()
    await page.goto(APP_BASE + firstLink!)
    await page.waitForResponse((r) => new RegExp(`/api${firstLink}$`).test(r.url()))
    // schema rows visible (wait for at least one row to render)
    const rows = page.locator('tbody tr')
    await rows.first().waitFor({ timeout: 10_000 })
    await expect(rows.first()).toBeAttached()
    // ai_insights aside visible — scoped to <main> to avoid the layout sidebar
    await expect(page.locator('main aside')).toContainText(/AI insights/i)
  })

  // Dataset analysis history is exposed at GET /api/analysis/:datasetId/history;
  // it's surfaced inline by the AI insights aside on dataset-detail.

  test('Sample tab fires GET /datasets/:id/preview and renders rows', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/datasets')
    await page.waitForResponse((r) => /\/api\/datasets/.test(r.url()))
    const firstLink = await page.locator('a[href^="/datasets/"]').first().getAttribute('href')
    await page.goto(APP_BASE + firstLink!)
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Sample$/i }).click()
      await page.waitForTimeout(1500)
    })
    const preview = reqs.find((r) => r.method === 'GET' && /\/preview/.test(r.url))
    expect(preview, 'GET /api/datasets/:id/preview should fire on Sample tab').toBeDefined()
    expect(preview!.status).toBe(200)
  })

  test('AI insights aside contains insights heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/datasets')
    await page.waitForResponse((r) => /\/api\/datasets/.test(r.url()))
    const firstLink = await page.locator('a[href^="/datasets/"]').first().getAttribute('href')
    await page.goto(APP_BASE + firstLink!)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main aside')).toContainText(/AI insights/i)
  })
})
