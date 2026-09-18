/**
 * /analytics — KPI summary, volume chart, range picker, CSV export.
 * Asserts on real artifacts: a real download event with non-empty
 * CSV content, and the range buttons updating ?range=… query.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedQueueItem, signup } from './_helpers.js'

test.describe('analytics page', () => {
  test('renders heading + range buttons + summary/volume API calls', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics')
      await expect(page.locator('h1')).toContainText(/analytics/i)
      await expect(page.getByRole('button', { name: /last 7 days/i })).toBeVisible()
    })
    const summary = reqs.find((r) => /\/api\/moderation\/stats\/summary/.test(r.url))
    const volume = reqs.find((r) => /\/api\/moderation\/stats\/volume/.test(r.url))
    expect(summary?.status).toBe(200)
    expect(volume?.status).toBe(200)
  })

  test('range buttons update the ?range=… query parameter', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await page.getByRole('button', { name: /last 30 days/i }).click()
    await expect(page).toHaveURL(/range=30d/)
    await page.getByRole('button', { name: /last 24h/i }).click()
    await expect(page).toHaveURL(/range=24h/)
  })

  test('CSV export triggers a real download with non-empty content', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Seed a couple of items so the volume series isn't empty.
    await seedQueueItem(page, accessToken, `Csv ${Date.now()}-A`)
    await seedQueueItem(page, accessToken, `Csv ${Date.now()}-B`)
    await page.goto(APP_BASE + '/analytics')

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }),
      page.getByRole('button', { name: /export csv/i }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/analytics-.*\.csv$/i)

    const path = await download.path()
    expect(path, 'download did not create a file').toBeTruthy()
    const fs = await import('node:fs')
    const stats = fs.statSync(path!)
    expect(stats.size).toBeGreaterThan(10)
    const body = fs.readFileSync(path!, 'utf-8')
    expect(body).toMatch(/^date,total/)
  })
})
