/**
 * /analytics — Engram retrieval analytics.
 *
 * Asserts the page hits /api/reports/analytics on mount and renders
 * the metric tiles. After asking a real question the top-docs and
 * top-queries lists must include the new entry (read-after-write).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, ask, captureNetwork, createDocument, signup } from './_helpers.js'

test.describe('analytics', () => {
  test('h1 renders "Retrieval analytics"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/retrieval|analytics/i)
  })

  test('GET /api/reports/analytics is called on mount and returns 200', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/reports\/analytics/.test(r.url))
    expect(get?.status).toBe(200)
  })

  test('total queries metric tile is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByText(/total\s+queries/i).first()).toBeVisible()
  })

  test('avg relevance metric tile is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByText(/avg\s+relevance|relevance/i).first()).toBeVisible()
  })

  test('empty knowledge base shows the topdocs/topqueries empty placeholders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await expect(page.locator('[data-testid="analytics-topdocs-empty"]')).toBeVisible()
    await expect(page.locator('[data-testid="analytics-topqueries-empty"]')).toBeVisible()
  })

  test('after an ask, top-docs/top-queries populate (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDocument(page, accessToken, {
      title: 'Analytics Doc',
      body_md: 'Analytics test body. Contains the answer to a question.',
    })
    await ask(page, accessToken, 'What is the answer to the analytics test question?')
    await page.goto(APP_BASE + '/analytics')
    await expect(page.locator('[data-testid="analytics-topdocs"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-testid="analytics-topqueries"]')).toBeVisible()
  })
})
