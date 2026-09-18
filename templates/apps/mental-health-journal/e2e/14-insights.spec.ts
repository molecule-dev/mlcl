import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/insights', () => {
  test('renders Insights heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { level: 1, name: /^Insights$/i })).toBeVisible()
  })

  test('renders Mood timeline section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { level: 3, name: /Mood timeline/i })).toBeVisible()
  })

  test('renders Mood trend chart', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('img', { name: /Mood trend chart/i })).toBeVisible()
  })

  test('renders AI reflection panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByText(/AI reflection/i)).toBeVisible()
  })

  test('renders Top themes section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { level: 3, name: /Top themes/i })).toBeVisible()
  })

  test('renders Triggers section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(
      page.getByRole('heading', { level: 3, name: /Patterns that move your mood/i }),
    ).toBeVisible()
  })

  test('GET /api/journal/insights is called on page load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.goto(APP_BASE + '/insights')
      await page.waitForResponse((r) => r.url().includes('/api/journal/insights'), {
        timeout: 10_000,
      })
    })
    const insights = reqs.find((r) => r.method === 'GET' && r.url.includes('/api/journal/insights'))
    expect(insights, 'GET /api/journal/insights observed').toBeDefined()
    expect(insights!.status, 'API returned 2xx').toBeLessThan(300)
  })
})
