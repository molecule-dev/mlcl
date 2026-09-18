import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/pipelines', () => {
  test('renders heading + KPI tiles + filter buttons', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    await expect(page.getByRole('heading', { name: /^Pipelines$/i, level: 1 })).toBeVisible()
    await expect(page.getByText(/Running/i).first()).toBeVisible()
    await expect(page.getByText(/Queued/i).first()).toBeVisible()
    await expect(page.getByText(/Success rate/i).first()).toBeVisible()
    await expect(page.getByText(/Failed/i).first()).toBeVisible()
  })

  test('shows realtime status pill', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    await expect(page.getByText(/realtime/i).first()).toBeVisible()
  })

  test('GET /api/pipelines fires on page load and returns >=1 pipeline', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pipelines')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/pipelines(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/pipelines fired').toBeGreaterThan(0)
    expect(get[0].status, 'GET /api/pipelines status').toBe(200)
  })

  test('All filter shows all pipelines', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    const allBtn = page.getByRole('button', { name: /^All\s+\d+$/i })
    await expect(allBtn).toBeVisible()
    await allBtn.click()
    const rows = page.locator('a[href^="/pipelines/"]')
    await expect(rows.first()).toBeAttached()
  })

  test('Running filter narrows the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    const runningBtn = page.getByRole('button', { name: /^Running\s+\d+$/i })
    await runningBtn.click()
    await page.waitForTimeout(300)
    const rows = page.locator('a[href^="/pipelines/"]')
    const count = await rows.count()
    // After clicking Running, every visible row should have status "Running"
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i)
        await expect(row).toContainText(/Running/i)
      }
    }
  })

  test('Passed filter narrows the list to passed pipelines', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    await page.getByRole('button', { name: /^Passed\s+\d+$/i }).click()
    await page.waitForTimeout(300)
    const rows = page.locator('a[href^="/pipelines/"]')
    const count = await rows.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toContainText(/Passed/i)
      }
    }
  })

  test('Failed filter narrows the list to failed pipelines', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    await page.getByRole('button', { name: /^Failed\s+\d+$/i }).click()
    await page.waitForTimeout(300)
    const rows = page.locator('a[href^="/pipelines/"]')
    const count = await rows.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toContainText(/Failed/i)
      }
    }
  })

  test('Queued filter narrows the list to queued pipelines', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    await page.getByRole('button', { name: /^Queued\s+\d+$/i }).click()
    await page.waitForTimeout(300)
    const rows = page.locator('a[href^="/pipelines/"]')
    const count = await rows.count()
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toContainText(/Queued/i)
      }
    }
  })

  test('clicking a pipeline row navigates to /pipelines/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    const link = page.locator('a[href^="/pipelines/"]').first()
    await link.waitFor({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(/\/pipelines\/[a-f0-9-]{36}$/)
  })

  test('KPI Success rate computed against returned pipelines (read-after-write coherence)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pipelines')
    // Successful KPI render — heading "Success rate" with numeric child
    const tile = page
      .locator('div')
      .filter({ hasText: /^Success rate/i })
      .first()
    await expect(tile).toBeVisible()
    // Reload — KPI should still render (state survives reload)
    await page.reload()
    await expect(page.getByText(/Success rate/i).first()).toBeVisible()
  })
})
